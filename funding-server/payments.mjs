const CHECKOUT_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);
const CHARGE_EVENTS = new Set(['charge.refunded', 'charge.dispute.created', 'charge.dispute.closed', 'charge.dispute.funds_withdrawn', 'charge.dispute.funds_reinstated']);
const objectId = value => typeof value === 'string' ? value : value?.id;

/** Called only after the Stripe SDK verifies the signature over the original request bytes. */
export function receiveEvent(event, ledger, config) {
  if (event.livemode !== config.live) throw new Error('Payment mode mismatch');
  const object = event.data.object;
  if (CHECKOUT_EVENTS.has(event.type)) {
    ledger.receive(event.id, 'session', object.id);
  } else if (CHARGE_EVENTS.has(event.type)) {
    const charge = event.type.startsWith('charge.dispute.') ? objectId(object.charge) : object.id;
    if (!charge) throw new Error('Missing charge reference');
    ledger.receive(event.id, 'charge', charge);
  }
}

/** Retrieve current provider state so late or reordered events cannot undo a refund. */
export async function reconcile(event, stripe, config) {
  let session;
  if (event.kind === 'session') {
    session = await stripe.checkout.sessions.retrieve(event.reference);
  } else {
    const charge = await stripe.charges.retrieve(event.reference);
    if (!charge.payment_intent) return null;
    const sessions = await stripe.checkout.sessions.list({ payment_intent: objectId(charge.payment_intent), limit: 10 });
    session = sessions.data.find(item => objectId(item.payment_link) === config.paymentLinkId);
  }
  if (!session || objectId(session.payment_link) !== config.paymentLinkId) return null;
  if (session.livemode !== config.live || session.currency?.toUpperCase() !== config.campaign.currency || session.mode !== 'payment') throw new Error('Campaign payment has unexpected mode or currency');
  if (session.payment_status !== 'paid') return null;
  if (!session.payment_intent) throw new Error('Paid checkout has no payment intent');
  const intent = await stripe.paymentIntents.retrieve(objectId(session.payment_intent), { expand: ['latest_charge'] });
  const charge = intent.latest_charge;
  if (!charge || typeof charge === 'string' || !charge.paid || charge.currency?.toUpperCase() !== config.campaign.currency || charge.livemode !== config.live) throw new Error('Charge could not be verified');
  if (!Number.isSafeInteger(charge.amount) || !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded < 0 || charge.amount_refunded > charge.amount) throw new Error('Invalid charge amount');
  return { session: session.id, amount: charge.disputed ? 0 : charge.amount - charge.amount_refunded };
}

export function runSpec(config) {
  return {
    campaignId: config.campaign.id, recipeId: config.recipeId, recipeSha256: config.recipeSha256,
    maxSpendUsdCents: config.maxSpendMinor, maxRuntimeSeconds: config.maxSeconds,
    fundingTargetUsdCents: config.campaign.targetMinor
  };
}

/** At-least-once delivery: dispatcher MUST persist this campaign ID before provisioning. */
export async function dispatch(job, config, request = fetch) {
  const pending = job.status === 'pending';
  if (pending && job.spec !== JSON.stringify(runSpec(config))) throw new Error('Stored run spec differs from the approved configuration');
  const url = `${config.dispatcher.replace(/\/$/, '')}/jobs/${encodeURIComponent(job.id)}`;
  const response = await request(url, {
    method: pending ? 'PUT' : 'GET', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${config.dispatcherToken}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.id },
    ...(pending ? { body: job.spec } : {})
  });
  if (!response.ok) throw new Error(`Run dispatcher returned ${response.status}`);
  const receipt = await response.json();
  if (receipt.campaignId !== job.id || !['queued', 'running', 'completed', 'failed'].includes(receipt.status)) throw new Error('Run dispatcher receipt does not match this campaign');
  return receipt.status;
}
