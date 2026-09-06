# David Webster

This project uses [Angular CLI](https://github.com/angular/angular-cli) 17.

The repository keeps its historical `webstarcloud.com` name. The canonical live
domain is `davidwebstar.com`.

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
The homepage leads with TMNL, LeasePlan and InvestSure, then current and earlier
work, technical skills, and the published `llm-input-hardening` package.

`src/assets/David-Webster.pdf` is an unchanged copy of that selected PDF. The
homepage links to `/assets/David-Webster.pdf`; the older
`/assets/David-Webster-AI-Systems-Builder.pdf` URL serves the same bytes for existing
links. Update both assets together when David selects a replacement CV. The build
script rejects missing or mismatched copies.

## Ventures and Labs

- `/` presents cloud platforms and AI agents, career highlights, current work,
  technical skills, a CV download and recent software development.
- `/ventures` lists the venture portfolio with working products first.
- `/ventures/anchorkeep` is the public AnchorKeep product cockpit, including interactive push, CI, failure, and recovery flows.
- `/greenlight` leads with a playable product walkthrough: choose managed identity
  or a company identity provider, preview an integration, and follow an agent action
  through human review to a simulated execution receipt. Visitors can pause, select
  chapters, approve, decline, or replay. The four-eyes policy console remains in an
  expandable section below. The identity integration is tested locally; managed
  onboarding and additional identity providers are explicitly proposed paths.
  Public copy uses Greenlight branding and company SSO terminology. Underlying
  identity infrastructure is documented in the separate backend project.
- `/anchorkeep` is the gated AnchorKeep workspace route.
- `/labs` lists research and package experiments.
- `/labs/llm-input-hardening` is an interactive browser preview of the package policies and stable reason codes.

The AnchorKeep workspace uses the existing Cognito/OIDC integration. When an unauthenticated user opens `/anchorkeep`, the app stores the intended return path in session storage, sends the user through Cognito, and returns them to `/anchorkeep` after login. The old `/safegit` routes redirect to the new URLs.

### AnchorKeep public demo

After deployment, the distributable route is `https://davidwebstar.com/ventures/anchorkeep`.
The public demo runs entirely in the visitor's browser: it models the real AnchorKeep v1 bucket keys, compare-and-swap ref update, push marker, AnchorKeep Pipe status transitions, terminal run invariant, and verified restore path. It never requests AWS credentials or claims to write to live infrastructure.

Use the success and failure scenarios to show that CI status and recoverability are separate guarantees. The authenticated `/anchorkeep` route remains the place for a future live owner-bucket connection.

## Interactive stage

The original Three.js hologram is the persistent home state. Its retained `dave.glb` model uses the original framing, additive glow shell, particle assembly, subtle deformation, and idle rotation. Opening Labs, Ventures, or a chat answer disperses the avatar before revealing the selected workspace; returning home reassembles it. The chat dock remains scoped to the home stage so it cannot obscure portfolio or product workspaces.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.
