# Gobwen · David Webster

This project uses [Angular CLI](https://github.com/angular/angular-cli) 17.

The repository keeps its historical `webstarcloud.com` name. The canonical live
domain is `davidwebstar.com`.

The homepage is a minimal chat interface with **Gobwen Flash**, **Gobwen Think**
and experimental **Goblin** choices. The original dodecahedron remains the site
identity. Research articles and the About/support page give the models context
without crowding the chat. Earlier projects remain paused, with shared demo URLs
preserved. Chat streams from three on-demand 4 GB AWS Lambda functions through
an authenticated gateway. Google sign-in includes 20 requests per UTC day,
subject to a shared 100-request daily preview allowance. Payments and supporter
entitlements are not connected yet.

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
The `/profile` page leads with TMNL, LeasePlan and InvestSure, then current and earlier
work, technical skills, and the published `llm-input-hardening` package.

`src/assets/David-Webster.pdf` is an unchanged copy of that selected PDF. The
profile page links to `/assets/David-Webster.pdf`; the older
`/assets/David-Webster-AI-Systems-Builder.pdf` URL serves the same bytes for existing
links. Update both assets together when David selects a replacement CV. The build
script rejects missing or mismatched copies.

## Pages and retained links

- `/` is Gobwen chat: model selection, streaming-ready conversations, stop/copy/
  retry, in-memory session history, input inspection and a performance panel.
  Empty `chatEndpoint` shows a connection-pending state and sends no message.
- `/research` is the article index. `/research/{runs,roadmap,architecture,questions,
  models,performance}` holds the journal and learning notes. Run results are
  curated dated snapshots, not live telemetry. Old `/notebook` links redirect to
  their corresponding research pages; `/notebook/funding` retains the funding plan.
- `/about` introduces David and the work. `/about#support` has the original 3D
  avatar in its funding chamber, with pause and reduced-motion support. The liquid
  represents verified contributions; unavailable data never becomes simulated money.
- `/profile` preserves the full career profile, CV and existing Dave's Brain demo,
  explicitly labeled as using an external model. `HomeComponent` is retained here.
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

The favicon is the original dodecahedron. The Gobwen social-preview
PNG is generated from its editable SVG with:

```bash
rsvg-convert -o src/assets/chat-og.png src/assets/chat-og.svg
```

The generated PNG is checked in; building the site does not require this tool.

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

The new Gobwen chat uses the protected SSE contract in
[CHAT-GATEWAY.md](CHAT-GATEWAY.md). It includes model selection, a real-package
inspection panel and four measured timing fields. Production uses the authenticated
streaming gateway in `../davesbrain/model-lambda`; see its `LIVE.md` for deployment,
limits and the emergency stop. The local chat endpoint remains empty to avoid
accidental production calls from development. The inspector is a separate backend
operation and does not call the chat models.

Chat now displays validated source links, first-answer latency and an optional
research-recording notice. The collapsed privacy panel defaults conversation
capture off; opting in sends messages/answers to LangWatch and a private archive
for review before future training. Basic timing/error metadata is still recorded
when capture is off. Turning capture off does not delete previous records.
Factual questions may be sent automatically to Brave Search; the backend returns
source excerpts, or an honest unavailable response when search cannot run.
Arithmetic-shaped requests use a bounded server calculator. No provider secrets
are shipped to the browser. Production uses Cognito-authenticated API Gateway
REST streaming, with shared quotas enforced before model invocation.

Dave's Brain shows a server-provided input-protection receipt with its answer or
block response, including library version, policy, reasons, and whether the model
was called. The profile page's **Try Dave's Brain's input protection** examples invoke
the real configured server guard via `attack_demo`. They stay available after the
anonymous model preview is consumed, and cannot make a model call. Only a successful
normal answer consumes that preview. Blocked inputs and network errors do not.

Deploy the matching Dave's Brain backend before publishing this frontend. In local
development, attack examples use the inspection server; normal chat uses the
configured existing endpoint. Production sends both to the same Dave's Brain API.
The standalone lab remains available for detailed policy/report exploration.

The original Three.js hologram is retained on the profile. Its `dave.glb` model uses the
original framing, additive glow shell, particle assembly, subtle deformation and
idle rotation. Earlier product and inspector routes retain their existing stage
modes. The legacy chat dock appears only on `/profile`. The About funding chamber
shares the avatar in display-only mode; the new homepage has its own chat surface.

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

## Community-funded Goblin run

The proposed first target is **US$72 for a 20B-token experiment**. The estimate,
recipe, fees and hard spending limit still require validation. The live funding
feed defaults to unconfigured, so the site shows “Awaiting payment setup” and a
funding-plan link, not an active contribution button or fabricated totals.

The independent [funding service](funding-server/README.md) implements signed
Stripe webhooks, a durable deduplicated ledger/inbox, refund handling, one launch
job per campaign and an adapter for a future hosted dispatcher. It is disabled
by default. Account onboarding, service deployment and a tested hosted GPU runner
are still required. No payment or paid launch was made during this change.

Set `fundingApiUrl` in the Angular environments only after the service is ready.
The endpoint must return the matching USD campaign and target, integer amounts,
a recent summary timestamp and an allowlisted Stripe checkout URL. Failed reads
hide stale balances and retry every 30 seconds; leaving the page stops polling.

The original chat and avatar share `ParticlesModule`; the chamber uses specimen
mode. Dave's Brain, public model serving, supporter usage allowances and Codex /
Claude / MCP integrations remain planned, without advertised availability.
