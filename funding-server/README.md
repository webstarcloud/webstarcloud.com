# Goblin run funding service

This is the server half of the chamber, separate from the GitHub Pages frontend.
It is **not deployed**, has no payment account, and does not include a GPU runner.
Collection and dispatch are disabled by default. No real payment or paid run was
performed during development.

The website separately displays **US$24.22 of existing donations reported by
the owner on 30 September 2026**, toward the existing US$72 target. This is a
dated manual report, not a Stripe receipt or transaction in this service. It
does not enable checkout, queue a job or launch compute. The frontend uses it
only while `fundingApiUrl` is empty; a future verified service feed replaces it
rather than adding it, avoiding duplicate counting. Reconcile the existing
donations and their accounting before connecting that feed. Do not seed fake
provider transactions or overwrite an existing real payment ledger.

The first proposed campaign is `goblin-20b-01`: **USD 72**, for the proposed 20B
experiment. This is the owner's initial compute estimate, not a verified quote.
The final recipe must specify fresh vs cumulative targets, checkpoint/data,
evaluations, provider, maximum hourly price, total cost and maximum runtime.
Do not infer those settings from the website's headline.

## Local verification

Requires Node 24 (uses its built-in SQLite API), separate from Angular tooling.

```sh
cd funding-server
npm ci
npm test
npm start
```

With no credentials the service starts on `127.0.0.1:8787`, exposes a read-only
`GET /funding` summary, and rejects payment webhooks as unconfigured. It creates
an ignored local `data/funding.sqlite`; no fake contributions are seeded.
`npm test` uses isolated databases, fake provider reads, SDK-signed test events
and a temporary HTTP server. It never contacts Stripe or a compute provider.

For configured testing, copy `.env.example` to `.env`, populate it locally and
run `node --env-file=.env server.mjs`. Never add secrets to Angular environments,
public JSON, Git, screenshots or chat.

## Payment path

Stripe is the proposed provider. Create the account yourself and complete its
onboarding. First use a **test-mode**, one-time, USD Payment Link with a custom
contribution amount. Configure that link's ID and hosted URL on the server.
The server accepts only paid sessions belonging to that exact link and mode.
Before enabling, verify the link, currency, custom amount bounds, receipt copy,
and return destination (`https://davidwebstar.com/notebook/funding`).

Register `/webhooks/stripe` for:

- `checkout.session.completed`, `checkout.session.async_payment_succeeded`
- `charge.refunded`
- `charge.dispute.created`, `charge.dispute.closed`,
  `charge.dispute.funds_withdrawn`, `charge.dispute.funds_reinstated`

The official SDK verifies the original body and timestamp/signature. Only event
IDs and object references enter a durable inbox before acknowledgement. A single
worker retrieves **current** Stripe state, ignoring unrelated or unpaid sessions,
then records a per-session amount transactionally. Duplicate and reordered events
cannot double count or reverse an already-known refund. Disputed charges are
conservatively excluded while Stripe marks them disputed. No donor names, emails,
card data or full webhook bodies are persisted or made public.

The displayed total is gross USD payments minus refunds/disputed amounts.
Processing fees are NOT silently subtracted or estimated. Enabling this version
requires the owner to explicitly choose `FUNDING_FEES_POLICY=owner-covers-fees`
and publish that policy. This is **not yet an agreed policy**. If fees should be
funded by contributors instead, change the target/accounting and public terms
before opening. Also decide and publish excess-funds, failed-run and refund
policies. No supporter access entitlement has been promised or implemented.

The target inserts exactly one durable job. The worker deactivates the Payment
Link before dispatching. Already-open sessions can still complete: record excess
funding honestly, but never queue a second run. Refunds below the target hold an
undispatched job. Do not automatically reopen a closed link after a refund.
Refunds/disputes after the runner accepts a job need operator reconciliation;
this service cannot recall compute already used.

## Runner contract — integration still required

`RUN_DISPATCHER_URL` must point to an independently implemented HTTPS service,
not a command executed on the owner's laptop. This repo contains the client
adapter and tests, **not that service or Runpod provisioning code**.

The worker sends an authenticated `PUT /jobs/goblin-20b-01`, with an identical
`Idempotency-Key`, containing:

```json
{
  "campaignId": "goblin-20b-01",
  "recipeId": "approved-recipe-id",
  "recipeSha256": "<64 lowercase hex characters>",
  "maxSpendUsdCents": 7200,
  "maxRuntimeSeconds": "<validated integer, not a suggested duration>",
  "fundingTargetUsdCents": 7200
}
```

The dispatcher must persist the campaign ID **before provisioning**, reconcile
ambiguous provider timeouts, and return the same job for every retry. A unique
SQLite job alone cannot ensure a GPU provider provisions exactly once. It must
reject mismatched specs, allow only the pinned recipe, enforce time and cost caps
independently of this process, save/verify artifacts, and shut down paid compute
after success, failure, timeout or controller loss. The current local Goblin
launcher requires an awake controller and does not satisfy this contract.

Both PUT and subsequent GET `/jobs/goblin-20b-01` return:

```json
{ "campaignId": "goblin-20b-01", "status": "queued" }
```

Valid statuses are `queued`, `running`, `completed`, `failed`. Return `queued`
only after durable acceptance. Failed jobs are terminal and require review;
the funding service never automatically relaunches one. Network failures retry
the same ID/spec; changed approved configuration blocks a pending retry.

## Deployment gates

1. Complete account onboarding and public funding policies; validate the budget.
2. Implement and test the hosted runner contract, including provider timeout,
   cost cap, backup failure and controller-loss shutdown cases.
3. Deploy this service behind HTTPS with **one process**, a persistent local
   volume, restrictive file permissions, backups and external error monitoring.
   SQLite WAL is not an ephemeral/serverless/shared-network-volume deployment.
4. Use the Stripe CLI/test account to validate a complete payment, target
   crossing, duplicate delivery, refund and run-dispatch lifecycle. Current tests
   cover our code boundary; they do not prove live provider integration.
5. Monitor `funding_worker_retry`, inbox backlog and jobs stuck pending. Configure
   ingress rate/body limits. Verify account/link/live-mode settings before opening.
6. Set `FUNDING_ENABLED=true` only with all required fields and the final policies.
   Put only the public service origin in Angular's `fundingApiUrl`, rebuild, and
   publish. The frontend polls every 30 seconds and hides invalid/stale responses.

The `GET /funding` timestamp means the summary was read now, not that a training
step or contribution happened now. A full tank is funded, not necessarily running.

Provider references: [signed webhooks](https://docs.stripe.com/webhooks),
[Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment),
[Payment Links](https://docs.stripe.com/payment-links).
