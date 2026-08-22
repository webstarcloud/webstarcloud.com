# David Webster

This project uses [Angular CLI](https://github.com/angular/angular-cli) 17.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

Run `npm run build:docs` to create the production build, synchronize it into `docs/`,
preserve the GitHub Pages control files, and refresh the Angular route fallback.

## Ventures and Labs

- `/` leads with David's AI Systems Builder proposition, verified production outcomes, CV/contact actions,
  and an AI-first Selected Work rail for `llm-input-hardening`, Agent API Hardening / Blacksmith, and Greenlight. Production work
  and hands-on R&D are labelled separately.
- `/ventures` lists the venture portfolio with working products first.
- `/ventures/anchorkeep` is the public AnchorKeep product cockpit, including interactive push, CI, failure, and recovery flows.
- `/greenlight` includes an interactive four-eyes decision simulation.
- `/anchorkeep` is the gated AnchorKeep workspace route.
- `/labs` lists research and package experiments.
- `/labs/llm-input-hardening` is an interactive browser preview of the package policies and stable reason codes.

The AnchorKeep workspace uses the existing Cognito/OIDC integration. When an unauthenticated user opens `/anchorkeep`, the app stores the intended return path in session storage, sends the user through Cognito, and returns them to `/anchorkeep` after login. The old `/safegit` routes redirect to the new URLs.

The public CV action expects `src/assets/David-Webster-AI-Systems-Builder.pdf` so the Angular asset build publishes one stable URL. The source of truth is `career/cv/current/David-Webster-AI-Systems-Builder.pdf` at the workspace root.

### AnchorKeep public demo

After deployment, the distributable route is `https://webstarcloud.com/ventures/anchorkeep`.
The public demo runs entirely in the visitor's browser: it models the real AnchorKeep v1 bucket keys, compare-and-swap ref update, push marker, AnchorKeep Pipe status transitions, terminal run invariant, and verified restore path. It never requests AWS credentials or claims to write to live infrastructure.

Use the success and failure scenarios to show that CI status and recoverability are separate guarantees. The authenticated `/anchorkeep` route remains the place for a future live owner-bucket connection.

## Interactive stage

The multi-frame ASCII portrait is the persistent home state. Its detailed character frames, blink, head movement, and palette respond without loading a 3D model or running a WebGL render loop. The chat dock remains scoped to the home stage so it cannot obscure portfolio or product workspaces.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.
