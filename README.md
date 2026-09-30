# David Webster · Intelligence research

This project uses [Angular CLI](https://github.com/angular/angular-cli) 17.

The repository keeps its historical `webstarcloud.com` name. The canonical live
domain is `davidwebstar.com`.

The homepage is a minimal research assistant with **Think** selected by default,
**Flash** for direct answers, and **Goblin** for experimental base-model continuation.
Public copy uses an intelligence research identity, without a fantasy assistant
persona. The original dodecahedron remains the site
identity. Research articles and the About/support page give the models context
without crowding the chat. Earlier projects remain paused, with shared demo URLs
preserved. Chat streams from on-demand 4 GB AWS Lambda functions through
an authenticated gateway. Google sign-in includes 20 requests per UTC day,
subject to a shared 100-request daily preview allowance. Payments and supporter
entitlements are not connected yet.

The assistant is the entry point to a public architectural notebook. The empty
chat introduces it as an experiment in rebuilding the assistant stack; a visible
Architecture link follows the real request through six expandable layers.
Input protection and the model menu link to the relevant explanations. Performance
remains a research article; its two homepage shortcuts have been removed.
The notes distinguish deployed behavior, diagnostic evidence and planned work.
Opt-in personal memory and explicit Python sandbox execution are implemented.
Learned model routing, MCP actions and GPU serving remain future experiments.
Goblin-250M is a nanoGPT-inspired base-model training experiment with a short
continuation option in the menu. It does not define the assistant persona or site identity.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

Run `npm run build:docs` to create the production build, synchronize it into `docs/`,
preserve the GitHub Pages control files, and create an `index.html` shell for every
Angular route. Those route shells let direct links return HTTP 200 on GitHub Pages;
unknown paths continue to use `404.html`. Add new routes to `SPA_ROUTES` in
`scripts/build-docs.sh` so the deployment keeps this guarantee.

To build, commit, and push the complete site update to GitHub Pages, run:

```bash
./deploy.sh "Deploy: describe the change"
```

The deploy script accepts `--yes` to skip its confirmation prompt. It only runs from
`main`, validates the GitHub repository and `davidwebstar.com` CNAME, rejects a stale
or diverged branch, stages all current changes for review, and uses a normal (non-force)
push to `origin/main`. Cancelling leaves the reviewed changes staged but makes no commit
or push. GitHub Pages publishes the committed `docs/` directory asynchronously.

## Profile and CV

The headline is **Building agentic AI platforms and unified control planes**,
David's preferred LinkedIn wording. Supporting content follows his selected
`career/cv/targeted/thijs-grond/David-Webster.pdf` in the parent workspace.
The `/about` page combines the research introduction, support information and
career profile. Its Experience section leads with TMNL, LeasePlan and InvestSure,
then current Backbase work, expandable earlier roles and technical skills.
The old `/profile` route leads to `/about#experience`.

`src/assets/David-Webster.pdf` is an unchanged copy of that selected PDF. The
About page links to `/assets/David-Webster.pdf`; the older
`/assets/David-Webster-AI-Systems-Builder.pdf` URL serves the same bytes for existing
links. Update both assets together when David selects a replacement CV. The build
script rejects missing or mismatched copies.

## Pages and retained links

- `/` is the research assistant: mode selection, streamed conversations, stop/copy/
  retry, in-memory session history, input inspection, real tool activity and an
  approximate cumulative cost comparison.
  Empty `chatEndpoint` shows a connection-pending state and sends no message.
- `/research` is the article index. `/research/{runs,roadmap,architecture,questions,
  models,performance,input-protection,search,evaluations}` holds the journal and learning notes. Run results are
  curated dated snapshots, not live telemetry. Old `/notebook` links redirect to
  their corresponding research pages; `/notebook/funding` retains the funding plan.
- `/about` introduces David and the work, with `/about#experience` for the career
  profile and CV. `/about#support` has a compact research
  funding card with a reported or verified balance and target. With no payment
  feed configured, it shows the owner's dated report of **US$24.22 toward US$72**.
  A future verified feed replaces that report without adding it; failed reads of
  a configured feed hide unavailable balances. The cloning chamber has been removed.
- `/profile` redirects to the career section on About. The earlier Three.js profile
  and chat demo remain in source for reference, without a public profile route.
- `/ventures`, `/labs` and `/projects` redirect to `/`.
- `/ventures/anchorkeep` is the paused AnchorKeep product cockpit, including interactive push, CI, failure, and recovery flows.
- `/greenlight` retains a paused playable product walkthrough: choose managed identity
  or a company identity provider, preview an integration, and follow an agent action
  through human review to a simulated execution receipt. Visitors can pause, select
  chapters, approve, decline, or replay. The four-eyes policy console remains in an
  expandable section below. The identity integration is tested locally; managed
  onboarding and additional identity providers are explicitly proposed paths.
  Public copy uses Greenlight branding and company SSO terminology. Underlying
  identity infrastructure is documented in the separate backend project.
- `/anchorkeep` is the gated AnchorKeep workspace route.
- `/labs/llm-input-hardening` runs the real v3.0.0 Rust/Python package through Dave's Brain.
  Visitors can inspect samples or text with three policies, compare output, and view
  enforcement decisions, encoded-Unicode evidence, and the full report. It makes
  no language-model call and does not send inspection text to application traces.

The old portfolio-index components remain in source for reference but are no
longer routed. Retained AnchorKeep and Greenlight pages display a paused notice.
The existing inspector path is unchanged so external links continue to work.

The favicon and social preview use the original dodecahedron. The older themed
social artwork is retained as an unused historical asset. Internal component names,
API aliases and the funding campaign ID remain compatible with existing services.
About reuses the original `dave.glb` portrait with its hologram shaders and particle
assembly; the renderer loads when visible and disposes its resources on navigation.

### Input-hardening lab development

Start the inspection server from the separate `davesbrain` repository:

```bash
uv sync --project .
uv run --project . python scripts/serve_inspector.py
```

Then run this site's `npm start` and open `/labs/llm-input-hardening`.
Development uses `http://127.0.0.1:8001`; production uses the existing Dave's Brain
API Gateway endpoint. Deploy the updated Lambda with v3.0.0 before publishing the
frontend. The inspector posts `{operation: "inspect", text, policy}` to that same
endpoint, uses its existing API key and throttling, and accepts at most 2,000 Unicode
characters. Input is sent only when a visitor clicks a sample or **Inspect text**.
Changing input or policy cancels the current request and clears its result.

The AnchorKeep workspace uses the existing Cognito/OIDC integration. When an unauthenticated user opens `/anchorkeep`, the app stores the intended return path in session storage, sends the user through Cognito, and returns them to `/anchorkeep` after login. The old `/safegit` routes redirect to the new URLs.

### AnchorKeep public demo

After deployment, the distributable route is `https://davidwebstar.com/ventures/anchorkeep`.
The public demo runs entirely in the visitor's browser: it models the real AnchorKeep v1 bucket keys, compare-and-swap ref update, push marker, AnchorKeep Pipe status transitions, terminal run invariant, and verified restore path. It never requests AWS credentials or claims to write to live infrastructure.

Use the success and failure scenarios to show that CI status and recoverability are separate guarantees. The authenticated `/anchorkeep` route remains the place for a future live owner-bucket connection.

## Interactive stage

The research assistant uses the protected SSE contract in
[CHAT-GATEWAY.md](CHAT-GATEWAY.md). It includes model selection, a real-package
inspection panel, server tool events and measured timing fields. Production uses the authenticated
streaming gateway in `../davesbrain/model-lambda`; see its `LIVE.md` for deployment,
limits and the emergency stop. The local chat endpoint remains empty to avoid
accidental production calls from development. The inspector is a separate backend
operation and does not call the chat models.

Chat now displays validated source links, first-answer latency and an optional
research-recording notice. The collapsed privacy panel defaults conversation
capture off; opting in sends messages/answers to LangWatch and a private archive
for review before future training. Basic timing/error metadata is still recorded
when capture is off. Turning capture off does not delete previous records.
Automatic source lookup checks a configured trusted-page index first, then uses
a private SearXNG Lambda with Google, Bing and DuckDuckGo. Sources show whether
they came from the index or web search, including snapshot dates. The backend
returns an honest unavailable response when it cannot retrieve evidence. Index
refresh is manual; snapshots expire after seven days. The research architecture
page links the source archive for the AGPL search service. Its source-page and
engine lists live in `../davesbrain/model-lambda/search/`.
Arithmetic-shaped requests use a bounded server calculator. No provider secrets
are shipped to the browser. Production uses Cognito-authenticated API Gateway
REST streaming, with shared quotas enforced before model invocation.

The collapsed **Experiment tools** panel offers personal memory (Mem0) and a
Python sandbox (E2B) in the Qwen assistant modes. Both are off by default and reset
on new/reopened chats, sign-out and account changes. Memory saves only explicit
`Remember: ...` notes and retrieves up to three bounded notes for the current
question. `Show saved memories` lists notes with IDs; `Forget memory: <id>` removes
an owned note. Management exchanges are excluded from content recording even
when research recording is selected. Identity comes from the server-verified
account, not browser-supplied provider IDs. No automatic transcript ingestion or
weight updates occur.

`Run Python: ...` executes explicitly supplied code in a fresh E2B sandbox with
internet access disabled, a 10-second execution limit, a 30-second lifetime and
bounded text output. There is no automatic model-generated execution loop.
Server-side free-plan confirmations and shared fail-closed quotas gate provider
calls; the operator-confirmed Hobby accounts have no paid billing enabled. Keys remain in
AWS SecureString configuration. See `../davesbrain/model-lambda/PROVIDERS.md` for
the limits, consent boundaries and deployment controls.

The assistant and standalone inspector display server-provided protection
receipts. Deploy their matching backends before publishing changes to the client
contract. The earlier profile demo and chat dock remain in source; About now
contains the original `dave.glb` hologram, career information and funding card.
Earlier product and inspector routes retain their existing stage modes.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

Run `npm test -- --watch=false --browsers=ChromeHeadless` for the noninteractive
suite, including route compatibility, chat placement and paused notices.

Local verification on 28 September 2026: all 74 frontend tests passed in headless
watch mode, including stream framing, guard enforcement, timing provenance and
conversation cancellation/history. The production Pages build passed with 25
direct-route shells. Desktop and 390px chat, Research and About layouts were
checked, and the live local inspector returned v3.0.0 quarantine with
`IH033_ENCODED_RISKY_UNICODE` for the encoded-control example.
The previous funding-service check passed all
10 tests. Karma 6.3.20 with the installed Chrome
153 emits a full-page-reload error during browser shutdown, including when
running only the unchanged profile tests. Watch mode completes the suite cleanly;
the shutdown warning is a separate runner limitation.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Community-funded research run

The proposed first target is **US$72 for a 20B-token experiment**. The owner
reported **US$24.22 in existing donations on 30 September 2026**, shown as about
34% of that target. This is a manual report, explicitly separate from the future
payment ledger. The estimate, recipe, fees and hard spending limit still require
validation. The payment feed remains unconfigured, so the card offers a funding-plan
link rather than checkout or an automatic compute launch.

`REPORTED_DONATIONS` in `src/app/goblin-chamber/funding.service.ts` holds that dated
report. It is displayed only when `fundingApiUrl` is empty. A future verified
service feed replaces it rather than adding it; reconcile the existing donations
before connecting that feed. No fake provider transactions are seeded and no
real ledger data is overwritten.

The independent [funding service](funding-server/README.md) implements signed
Stripe webhooks, a durable deduplicated ledger/inbox, refund handling, one launch
job per campaign and an adapter for a future hosted dispatcher. It is disabled
by default. Account onboarding, service deployment and a tested hosted GPU runner
are still required. No payment or paid launch was made during this change.

Set `fundingApiUrl` in the Angular environments only after the service is ready.
The endpoint must return the matching USD campaign and target, integer amounts,
a recent summary timestamp and an allowlisted Stripe checkout URL. Failed reads
hide stale balances and retry every 30 seconds; leaving the page stops polling.

The retained profile chat and avatar source share `ParticlesModule`. Supporter allowances
and external Codex / Claude / MCP integrations remain planned. The public assistant
is already served through its protected gateway.

## Research refresh — 30 September 2026

The chat keeps an animated “Thinking…” status through connection, retrieval and
reasoning. Metadata and source events do not end it. The first answer delta replaces
it immediately, subsequent deltas append without an artificial typing delay, and
stop/error/completion remove the activity indicator. Reduced-motion preferences
disable the animation. Source cards and optional reasoning appear with the answer.
Real server events show calculator, source-lookup and maintained-profile activity
while the request runs and retain the completed tool receipt. Their fixed labels
expose neither tool inputs nor private errors. Tool-only responses correct the
initial cold/warm state to unknown because no model was loaded.

The matching backend replaces excerpt selection with short, source-grounded
generation. Both modes answer retrieved facts directly; Think still reasons on
other prompts. Source links are evidence to inspect, not a guarantee of accuracy.
Calculator/profile bypasses keep their real zero-token usage. Authentication,
input hardening, shared quotas and opt-in LangWatch capture remain in place.

The homepage cost summary is a durable, metadata-only comparison across completed
priced model requests from the date tracking begins. It assumes **US$3 per million
input tokens and US$15 per million output tokens**, with no named comparator,
and subtracts measured model-worker compute. These are approximate reference
rates, not a provider quote or net service bill savings. Gateway/search costs,
initialization/export overhead, storage, failed/stopped requests and discounts
are excluded. Different tokenizers, reasoning and answer quality limit the proxy.
Unpriced tool answers, missing data and negative differences remain explicit.
The existing gateway exposes a read-only summary with a 30-second cache and
separate throttle; a conditional request marker prevents duplicate increments.
See [the cost-comparison method](../davesbrain/model-lambda/COST_COMPARISON.md).
