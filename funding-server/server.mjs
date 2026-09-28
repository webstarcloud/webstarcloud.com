import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import Stripe from 'stripe';
import { readConfig } from './config.mjs';
import { Ledger } from './ledger.mjs';
import { receiveEvent, reconcile, runSpec, dispatch } from './payments.mjs';

export function createFundingServer(config, ledger, stripe) {
  return createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', config.origin);
    const reply = (status, data) => { res.writeHead(status); res.end(JSON.stringify(data)); };
    if (req.method === 'GET' && req.url === '/funding') return reply(200, ledger.summary(config));
    if (req.method !== 'POST' || req.url !== '/webhooks/stripe') return reply(404, { error: 'Not found' });
    if (!stripe || !config.secret) return reply(503, { error: 'Payments are not configured' });
    let payload;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 262_144) { reply(413, { error: 'Payload too large' }); return; }
        chunks.push(chunk);
      }
      payload = Buffer.concat(chunks);
    } catch { return reply(400, { error: 'Incomplete request' }); }
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, req.headers['stripe-signature'], config.secret);
      if (event.livemode !== config.live) throw new Error('Mode mismatch');
    } catch { return reply(400, { error: 'Invalid webhook signature or mode' }); }
    try {
      receiveEvent(event, ledger, config);
      reply(200, { received: true });
    } catch {
      console.error(JSON.stringify({ event: 'funding_inbox_failed', eventId: event.id }));
      reply(500, { error: 'Unable to persist payment event; retry required' });
    }
  });
}

export async function processQueue(config, ledger, stripe, request = fetch) {
  if (!stripe) return;
  for (const event of ledger.pending()) {
    // An unresolved payment event blocks dispatch; do not spend against an uncertain balance.
    ledger.completeEvent(event.id, await reconcile(event, stripe, config));
  }
  if (!config.enabled || ledger.pending().length) return;
  // A shared Payment Link remains usable after our page hides its button.
  // Close it before dispatch; failure leaves the funded job safely retryable.
  if (ledger.total() >= config.campaign.targetMinor) {
    const link = await stripe.paymentLinks.retrieve(config.paymentLinkId);
    if (link.active) await stripe.paymentLinks.update(config.paymentLinkId, { active: false });
  }
  ledger.ensureJob(runSpec(config));
  const job = ledger.job();
  if (job && ['pending', 'queued', 'running'].includes(job.status)) {
    ledger.setStatus(await dispatch(job, config, request));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = readConfig();
  const ledger = new Ledger(config.database, config.campaign);
  const stripe = config.key ? new Stripe(config.key, { maxNetworkRetries: 2, timeout: 10_000 }) : null;
  const server = createFundingServer(config, ledger, stripe);
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try { await processQueue(config, ledger, stripe); }
    catch (error) { console.error(JSON.stringify({ event: 'funding_worker_retry', errorType: error.name })); }
    finally { busy = false; }
  };
  const timer = setInterval(tick, 15_000);
  server.listen(config.port, config.host, () => {
    console.info(JSON.stringify({ event: 'funding_service_started', port: config.port, collectionEnabled: config.enabled, liveMode: config.live }));
    void tick();
  });
  const stop = () => { clearInterval(timer); server.close(); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
}
