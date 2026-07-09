# David Webster

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 14.0.2.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

> npx angular-cli-ghpages --dir=docs/

## Ventures and SafeGit

- `/ventures` lists investable product ideas.
- `/ventures/safegit` is the public SafeGit venture page.
- `/safegit` is the gated SafeGit workspace route.
- `/labs` lists research and package experiments.
- `/labs/llm-input-hardening` is the public LLM input hardening lab page.

The SafeGit workspace uses the existing Cognito/OIDC integration. When an unauthenticated user opens `/safegit`, the app stores the intended return path in session storage, sends the user through Cognito, and returns them to `/safegit` after login.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.
