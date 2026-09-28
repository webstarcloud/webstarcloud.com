import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Stripe from 'stripe';
import { Ledger } from './ledger.mjs';
import { CAMPAIGN, readConfig } from './config.mjs';
import { receiveEvent, reconcile, dispatch, runSpec } from './payments.mjs';
import { createFundingServer, processQueue } from './server.mjs';

const config = { ...readConfig({}), enabled: true, live: false, paymentLinkId: 'plink_test', paymentLinkUrl: 'https://buy.stripe.com/test_example', recipeId: 'test-only', recipeSha256: 'a'.repeat(64), maxSpendMinor: 7200, maxSeconds: 100, dispatcher: 'https://runner.example', dispatcherToken: 'test-only' };
const checkout = { id: 'cs_test', payment_link: config.paymentLinkId, livemode: false, currency: 'usd', mode: 'payment', payment_status: 'paid', payment_intent: 'pi_test' };
const charge = { id: 'ch_test', payment_intent: 'pi_test', currency: 'usd', amount: 7200, amount_refunded: 0, disputed: false, paid: true, livemode: false };
const provider = (session = checkout, payment = charge) => ({
  paymentLinks: { retrieve: async () => ({ active: false }), update: async () => ({ active: false }) },
  checkout: { sessions: { retrieve: async () => session, list: async () => ({ data: [session] }) } },
  charges: { retrieve: async () => payment }, paymentIntents: { retrieve: async () => ({ latest_charge: payment }) }
});
const event = (id = 'evt_test') => ({ id, livemode: false, type: 'checkout.session.completed', data: { object: checkout } });
const reply = status => ({ ok: true, json: async () => ({ campaignId: CAMPAIGN.id, status }) });

function ledgerFor(t) { const ledger = new Ledger(':memory:', CAMPAIGN); t.after(() => ledger.close()); return ledger; }

test('default config cannot take payments or launch; enabled config requires recipe and fee decisions', () => {
  assert.equal(readConfig({}).enabled, false);
  assert.throws(() => readConfig({ FUNDING_ENABLED: 'true' }), /missing/);
  const env = { FUNDING_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake', STRIPE_PAYMENT_LINK_ID: 'plink_test', STRIPE_PAYMENT_LINK_URL: config.paymentLinkUrl, RUN_DISPATCHER_URL: config.dispatcher, RUN_DISPATCHER_TOKEN: 'fake', RUN_RECIPE_ID: 'example', RUN_RECIPE_SHA256: 'a'.repeat(64), RUN_MAX_SPEND_USD_CENTS: '7200', RUN_MAX_SECONDS: '100' };
  assert.throws(() => readConfig(env), /processing fees/);
  assert.equal(readConfig({ ...env, FUNDING_FEES_POLICY: 'owner-covers-fees' }).enabled, true);
  assert.throws(() => readConfig({ ...env, RUN_MAX_SPEND_USD_CENTS: '7300' }), /cap/);
});

test('duplicate events and sessions count once; reaching the target creates one immutable job', async t => {
  const ledger = ledgerFor(t);
  receiveEvent(event(), ledger, config); receiveEvent(event(), ledger, config); receiveEvent(event('evt_duplicate'), ledger, config);
  let deliveries = 0;
  await processQueue(config, ledger, provider(), async (_url, request) => {
    deliveries++;
    assert.equal(request.method, 'PUT');
    assert.equal(request.headers['Idempotency-Key'], CAMPAIGN.id);
    assert.equal(JSON.parse(request.body).maxSpendUsdCents, 7200);
    return reply('queued');
  });
  assert.equal(ledger.total(), 7200); assert.equal(deliveries, 1);
  ledger.ensureJob({ ...runSpec(config), maxSpendUsdCents: 1 });
  assert.equal(JSON.parse(ledger.job().spec).maxSpendUsdCents, 7200);
  await processQueue(config, ledger, provider(), async (_url, request) => { assert.equal(request.method, 'GET'); return reply('completed'); });
  await processQueue(config, ledger, provider(), async () => { assert.fail('Completed job must never launch again'); });
  assert.equal(ledger.summary(config).status, 'completed');
});

test('unpaid, unrelated, wrong-currency and wrong-mode payments cannot fund the goal', async t => {
  const ledger = ledgerFor(t);
  assert.throws(() => receiveEvent({ ...event(), livemode: true }, ledger, config), /mismatch/);
  for (const session of [{ ...checkout, payment_status: 'unpaid' }, { ...checkout, payment_link: 'another_link' }]) {
    assert.equal(await reconcile({ kind: 'session', reference: 'cs_test' }, provider(session), config), null);
  }
  await assert.rejects(reconcile({ kind: 'session', reference: 'cs_test' }, provider({ ...checkout, currency: 'eur' }), config), /currency/);
  assert.equal(ledger.total(), 0);
});

test('refund before delayed checkout uses current provider state; disputes count zero', async t => {
  const ledger = ledgerFor(t);
  receiveEvent({ ...event(), type: 'charge.refunded', data: { object: charge } }, ledger, config);
  receiveEvent(event('evt_late_checkout'), ledger, config);
  await processQueue(config, ledger, provider(checkout, { ...charge, amount_refunded: 2000 }));
  assert.equal(ledger.total(), 5200); assert.equal(ledger.job(), undefined);
  const disputed = await reconcile({ kind: 'session', reference: 'cs_test' }, provider(checkout, { ...charge, disputed: true }), config);
  assert.equal(disputed.amount, 0);
});

test('refund holds a pending launch, while failed provider reads leave the inbox retryable', async t => {
  const ledger = ledgerFor(t);
  ledger.completeEvent('manual-test', { session: 'cs_test', amount: 7200 }); ledger.ensureJob(runSpec(config));
  ledger.completeEvent('refund-test', { session: 'cs_test', amount: 0 });
  assert.equal(ledger.job().status, 'held');
  receiveEvent(event(), ledger, config);
  const stripe = provider(); stripe.checkout.sessions.retrieve = async () => { throw new Error('offline'); };
  await assert.rejects(processQueue(config, ledger, stripe), /offline/);
  assert.equal(ledger.pending().length, 1);
});

test('restart preserves funding and the same retryable launch ID after an ambiguous timeout', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'goblin-ledger-test-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  let ledger = new Ledger(join(dir, 'funding.sqlite'), CAMPAIGN);
  receiveEvent(event(), ledger, config);
  await assert.rejects(processQueue(config, ledger, provider(), async () => { throw new Error('timeout after acceptance'); }), /timeout/);
  const spec = ledger.job().spec; ledger.close(); ledger = new Ledger(join(dir, 'funding.sqlite'), CAMPAIGN); t.after(() => ledger.close());
  assert.equal(ledger.total(), 7200);
  await processQueue(config, ledger, provider(), async (_url, request) => { assert.equal(request.body, spec); return reply('running'); });
  assert.equal(ledger.summary(config).status, 'running');
});

test('overfunding is recorded without a second run; disabled collection exposes no payment URL', t => {
  const ledger = ledgerFor(t);
  ledger.completeEvent('a', { session: 'a', amount: 7000 }); ledger.completeEvent('b', { session: 'b', amount: 500 });
  ledger.ensureJob(runSpec(config)); ledger.ensureJob(runSpec(config));
  assert.equal(ledger.total(), 7500); assert.equal(ledger.db.prepare('SELECT COUNT(*) AS n FROM launch').get().n, 1);
  assert.equal(ledger.summary({ ...config, enabled: false }).checkoutUrl, null);
});

test('dispatcher cannot acknowledge the wrong run or an invented state', async () => {
  await assert.rejects(dispatch({ id: CAMPAIGN.id, status: 'pending', spec: JSON.stringify(runSpec(config)) }, config, async () => ({ ok: true, json: async () => ({ campaignId: 'wrong', status: 'running' }) })), /does not match/);
  await assert.rejects(dispatch({ id: CAMPAIGN.id, status: 'pending', spec: '{}' }, config), /differs/);
});

test('payment link must be deactivated before automatic dispatch', async t => {
  const ledger = ledgerFor(t); receiveEvent(event(), ledger, config);
  const stripe = provider(); let closed = false;
  stripe.paymentLinks.retrieve = async () => ({ active: true });
  stripe.paymentLinks.update = async (_id, params) => { closed = params.active === false; };
  await processQueue(config, ledger, stripe, async () => { assert.equal(closed, true); return reply('queued'); });
});

test('HTTP rejects unsigned and tampered webhooks and durably accepts an SDK-signed event', async t => {
  const ledger = ledgerFor(t); const stripe = new Stripe('sk_test_fake'); const secret = 'whsec_test_only';
  const server = createFundingServer({ ...config, secret }, ledger, stripe);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const payload = JSON.stringify(event());
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal((await fetch(`${url}/webhooks/stripe`, { method: 'POST', body: payload })).status, 400);
  assert.equal((await fetch(`${url}/webhooks/stripe`, { method: 'POST', body: payload + ' ', headers: { 'stripe-signature': signature } })).status, 400);
  assert.equal((await fetch(`${url}/webhooks/stripe`, { method: 'POST', body: payload, headers: { 'stripe-signature': signature } })).status, 200);
  assert.equal(ledger.pending().length, 1);
  const response = await fetch(`${url}/funding`); const summary = await response.json();
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(summary.receivedMinor, 0);
  assert.equal(JSON.stringify(summary).includes('cs_test'), false);
});
