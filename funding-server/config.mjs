export const CAMPAIGN = Object.freeze({ id: 'goblin-20b-01', currency: 'USD', targetMinor: 7200 });

export function readConfig(env = process.env) {
  const enabled = env.FUNDING_ENABLED === 'true';
  const live = env.STRIPE_LIVE_MODE === 'true';
  const config = {
    enabled, live, campaign: CAMPAIGN,
    key: env.STRIPE_SECRET_KEY || '', secret: env.STRIPE_WEBHOOK_SECRET || '',
    paymentLinkId: env.STRIPE_PAYMENT_LINK_ID || '', paymentLinkUrl: env.STRIPE_PAYMENT_LINK_URL || '',
    dispatcher: env.RUN_DISPATCHER_URL || '', dispatcherToken: env.RUN_DISPATCHER_TOKEN || '',
    recipeId: env.RUN_RECIPE_ID || '', recipeSha256: env.RUN_RECIPE_SHA256 || '',
    maxSpendMinor: Number(env.RUN_MAX_SPEND_USD_CENTS || 0), maxSeconds: Number(env.RUN_MAX_SECONDS || 0),
    feesPolicy: env.FUNDING_FEES_POLICY || '',
    origin: env.SITE_ORIGIN || 'https://davidwebstar.com',
    database: env.FUNDING_DATABASE || './data/funding.sqlite',
    port: Number(env.PORT || 8787), host: env.HOST || '127.0.0.1'
  };
  if (enabled) {
    for (const name of ['key', 'secret', 'paymentLinkId', 'paymentLinkUrl', 'dispatcher', 'dispatcherToken', 'recipeId']) {
      if (!config[name]) throw new Error(`Funding cannot open: missing ${name}`);
    }
    if (!new RegExp(`^sk_${live ? 'live' : 'test'}_`).test(config.key)) throw new Error('Stripe key does not match the configured mode');
    const checkout = new URL(config.paymentLinkUrl);
    const runner = new URL(config.dispatcher);
    if (checkout.protocol !== 'https:' || checkout.hostname !== 'buy.stripe.com' || checkout.username || checkout.password) throw new Error('Use a Stripe-hosted Payment Link');
    if (runner.protocol !== 'https:' || runner.username || runner.password || runner.search || runner.hash) throw new Error('Run dispatcher must have a fixed HTTPS URL');
    if (!/^[a-f0-9]{64}$/.test(config.recipeSha256)) throw new Error('Pin the approved recipe SHA-256');
    if (!Number.isSafeInteger(config.maxSpendMinor) || config.maxSpendMinor <= 0 || config.maxSpendMinor > CAMPAIGN.targetMinor) throw new Error('Compute cap must be between 1 and 7200 USD cents');
    if (!Number.isSafeInteger(config.maxSeconds) || config.maxSeconds <= 0) throw new Error('Set a validated runtime cap');
    if (config.feesPolicy !== 'owner-covers-fees') throw new Error('Resolve processing fees before opening gross-target funding');
  }
  return config;
}
