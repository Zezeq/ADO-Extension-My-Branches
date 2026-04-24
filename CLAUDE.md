# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Azure DevOps (ADO) extension named **My Branches** (package name: `my-branches`). It lets the logged-in user see all branches they created, using their session token as identity context. It targets both Azure DevOps Services (cloud) and Azure DevOps Server (on-prem) via `Microsoft.VisualStudio.Services` and `Microsoft.TeamFoundation.Server` in the manifest. Do not use `Microsoft.VisualStudio.Services.Integration` — that target is for third-party service integrations and requires a `getstarted` link.

The extension contributes two hubs:

| Hub | Location | Contribution target |
|---|---|---|
| `org-hub` | Organization / collection start page | `ms.vss-web.collection-overview-hub-group` |
| `repos-hub` | Repos section inside each project | `ms.vss-code-web.code-hub-group` |

**Branch ownership** is determined by `GitRef.creator.uniqueName` from the ADO REST API (`GET .../refs?filter=heads/`). This is the identity of whoever pushed the branch into existence. The current user's identity is obtained via `SDK.getUser().name`, which returns the same `uniqueName` (login/email) format.

The publisher ID in `vss-extension.json` is **not a secret** — it is a public identifier visible in the marketplace URL.

## Development Environment

The project uses a Dev Container based on `mcr.microsoft.com/devcontainers/javascript-node:18`. Claude Code is installed globally inside the container via `npm install -g @anthropic-ai/claude-code`.

An `ANTHROPIC_API_KEY` secret is expected in the environment (configured via the devcontainer secrets block).

## Commands

| Command | Purpose |
|---|---|
| `npm run build` | Production webpack bundle → `dist/` |
| `npm run build:dev` | Development bundle with source maps |
| `npm run watch` | Incremental dev build on file change |
| `npm test` | Run Jest unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run package` | Build + create `.vsix` via `tfx` |

## Versioning

The extension version is calculated automatically by the CI workflow — do not edit the `version` field in `vss-extension.json` by hand.

### Scheme

```
<major>.<minor>.<patch>
```

- **major.minor** — taken from the most recent git tag (e.g. `v1.2` or `1.2`). Tags must be in `X.Y` format.
- **patch** — number of commits since that tag. If no tag exists, major.minor defaults to `0.1` and patch is the total commit count.

### Bumping major or minor

Create a new tag on the commit that should start the new version:

```
git tag v1.0
git push origin v1.0
```

The next CI run will produce `1.0.<commits-since-tag>`.

## Git Commit Messages

Write commit messages in the imperative mood — phrase the subject as a command, as if completing the sentence "If applied, this commit will…":

> Add branch filter for case-insensitive email match

### Structure

```
<subject — max 50 characters>
<blank line>
<body>
```

### Subject line

- Keep it at 50 characters or fewer.
- Capitalise the first word.
- Do not end with a period.
- Use the imperative mood: "Fix", "Add", "Remove", "Update", "Refactor" — not "Fixed", "Adding", or "Adds".

### Body

- Separate from the subject with a blank line.
- Wrap lines at 72 characters.
- Explain **what** changed and **why** — not how (the diff shows how).
- Use bullet points where multiple distinct changes need listing.

### Examples

```
Add org-hub contribution to collection overview

Register the org-hub as a hub contribution targeting
ms.vss-web.collection-overview-hub-group so the tab appears
on the organisation start page for both cloud and on-prem.
```

```
Filter branches by creator.uniqueName instead of commit author

The GitRef.creator field identifies who pushed the branch into
existence. The previous approach used commit author email, which
could differ from the branch creator when commits are cherry-picked
or rebased.

- Update BranchRef interface to reflect the GitRef shape
- Replace isBranchOwnedByUser logic accordingly
- Update all affected unit tests
```

## Code Quality Standards

### Clean Code Principles

All code in this project must follow Clean Code principles:

- **Meaningful names**: Variables, functions, and classes must clearly express intent. Avoid abbreviations and single-letter names outside of loop counters.
- **Small functions**: Each function does one thing only. If a function needs a comment to explain what it does, it should be broken down further.
- **No duplication**: Extract repeated logic. Follow DRY (Don't Repeat Yourself).
- **Single Responsibility**: Each module, class, and function has one reason to change.
- **Minimal side effects**: Functions should not produce unexpected side effects. Prefer pure functions where possible.
- **No dead code**: Remove unused variables, functions, imports, and commented-out code.

### Automated Testing

The vast majority of code must be covered by automated tests. Specifically:

- Write tests before or alongside implementation — do not leave testing as an afterthought.
- Unit tests are required for all business logic, utility functions, and non-trivial computations.
- Integration tests are required for API calls, storage interactions, and cross-module behavior.
- Do not consider a feature complete until its automated tests pass.
- Tests must be readable and follow the same Clean Code standards as production code.

## Architecture Notes

### Tech stack

| Tool | Role |
|---|---|
| TypeScript 5 | Language |
| Webpack 5 | Bundler — one entry point per hub, outputs to `dist/<hub>/` |
| Jest + ts-jest | Unit testing (jsdom environment) |
| `azure-devops-extension-sdk` | SDK init, current user identity |
| `azure-devops-extension-api` | Typed REST clients (Git, etc.) |
| `tfx-cli` | Packages the extension into a `.vsix` |

### Source layout

```
src/
  common/
    branchService.ts   # Pure business logic — no SDK imports, fully unit-tested
    sdkClient.ts       # SDK init + API client factory (thin wiring layer)
  org-hub/
    index.html / index.ts   # Entry point for the org/collection hub
  repos-hub/
    index.html / index.ts   # Entry point for the repos hub
tests/
  unit/
    branchService.test.ts
  __mocks__/
    styleMock.js
```

### Key design rules

- `branchService.ts` must remain free of SDK/API imports so it can be unit-tested without mocking the ADO runtime.
- New hubs are added by appending to the `hubs` array in `webpack.config.js` and registering a contribution in `vss-extension.json`.
- Tests enforce a minimum **80% line coverage** threshold (`jest --coverage`).
