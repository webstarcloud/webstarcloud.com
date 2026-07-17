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

- `/` includes a one-click Selected Work rail for AnchorKeep, Greenlight, and `llm-input-hardening`.
- `/ventures` lists the venture portfolio with working products first.
- `/ventures/anchorkeep` is the lead venture and public AnchorKeep product cockpit, including interactive push, CI, failure, and recovery flows.
- `/greenlight` includes an interactive four-eyes decision simulation.
- `/anchorkeep` is the gated AnchorKeep workspace route.
- `/labs` lists research and package experiments.
- `/labs/llm-input-hardening` is an interactive browser preview of the package policies and stable reason codes.

The AnchorKeep workspace uses the existing Cognito/OIDC integration. When an unauthenticated user opens `/anchorkeep`, the app stores the intended return path in session storage, sends the user through Cognito, and returns them to `/anchorkeep` after login. The old `/safegit` routes redirect to the new URLs.

### AnchorKeep public demo

After deployment, the distributable route is `https://webstarcloud.com/ventures/anchorkeep`.
The public demo runs entirely in the visitor's browser: it models the real AnchorKeep v1 bucket keys, compare-and-swap ref update, push marker, AnchorKeep Pipe status transitions, terminal run invariant, and verified restore path. It never requests AWS credentials or claims to write to live infrastructure.

Use the success and failure scenarios to show that CI status and recoverability are separate guarantees. The authenticated `/anchorkeep` route remains the place for a future live owner-bucket connection.

## Interactive stage

The Three.js avatar is the persistent home state. Opening Labs, Ventures, or a chat answer disperses the retained avatar point cloud before revealing the selected workspace. Returning home reassembles those particles into the avatar. The chat dock is intentionally scoped to the home stage so it cannot obscure portfolio or product workspaces. Keep route content inside the root stage shell so navigation and chat continue to share that transition lifecycle.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.
