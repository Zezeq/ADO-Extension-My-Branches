# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Keep this file up to date.** Whenever new functionality, design decisions, architectural patterns, or ways of working are introduced, update the relevant section or add a new one. This file is the shared source of truth for all developers and AI assistants working on this project.

**Keep `overview.md` up to date.** This file is the marketplace listing that end users read before installing the extension. It must always reflect the current state of the extension's functionality. Any time a user-facing feature is added, changed, or removed — new columns, filter behaviour, stale threshold, hub locations, compatibility, etc. — `overview.md` must be updated in the same PR.

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

The project uses a Dev Container based on `mcr.microsoft.com/devcontainers/javascript-node:22`. Claude Code is installed globally inside the container via `npm install -g @anthropic-ai/claude-code`.

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

- **major.minor** — taken from the most recent git tag (e.g. `v1.2` or `1.2`). Tags must be in `X.Y` format. Defaults to `0.1` if no tag exists.
- **patch** — number of commits on `origin/main` since that tag.
- **Main builds**: `major.minor.patch`
- **PR builds**: `major.minor.patch.run_number` — the 4th segment guarantees each PR build is unique and always higher than the current main release, so it can be installed on top for testing. After the PR merges and main CI runs, the incremented patch makes the main build higher again.

### Bumping major or minor

Create a new tag on the commit that should start the new version:

```
git tag v1.0
git push origin v1.0
```

Pushing a tag triggers CI immediately and produces `1.0.0` (0 commits since tag).

## Extension Variants

Two extension variants are maintained from a single codebase:

| Variant | Manifest | Extension ID | Public | Purpose |
|---|---|---|---|---|
| Production | `vss-extension.json` | `my-branches` | `true` | Marketplace release |
| Dev | `vss-extension.dev.json` (override) | `my-branches-dev` | `false` | Verification installs |

`vss-extension.dev.json` only overrides `id`, `name`, and `public` — all other fields come from `vss-extension.json`. Because the IDs differ, both variants can be installed simultaneously in the same ADO organisation.

### CI artifacts

- **Dev VSIX** (`my-branches-dev-<version>`) — built on every run (PRs and main). For installing and verifying before merging.
- **Prod VSIX** (`my-branches-<version>`) — built on main and tag pushes only. For uploading to the marketplace.

### Publishing

Publishing is **manual**. Download the prod VSIX artifact from a main or tag CI run and upload it at `marketplace.visualstudio.com/manage`. There is no automated publish step in CI and no PAT secret is required.

## Asset Constraints

**SVG files are not supported in ADO extension packages.** The marketplace rejects any `.vsix` that contains an SVG. All icons and images must be PNG or JPG.

The `files` array in `vss-extension.json` includes the entire `images/` directory, so **every file placed there is bundled into the VSIX** — not just files referenced by the manifest. Never place an SVG anywhere inside `images/`.

Always generate icons as PNG. The `images/hub-icon.png` and `images/logo.png` files are produced by the inline Node.js scripts in the git history — re-run those scripts if the source needs to change.

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
- Do not include AI co-author attribution (`Co-Authored-By`) in any commit.

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
    BranchTable.tsx    # Shared React component — renders the full hub UI
    branchService.ts   # Pure business logic — ownership, sort, filter; fully unit-tested
    gitService.ts      # ADO Git API calls — fetches refs and maps them to BranchDetail
    sdkClient.ts       # SDK init + API client factory (thin wiring layer)
    styles.css         # Shared styles for both hubs
    urlUtils.ts        # ADO URL builders for branch, repo branches, and project pages
  declarations.d.ts    # Module declarations (e.g. CSS imports)
  org-hub/
    index.html / index.tsx   # Entry point for the org/collection hub
  repos-hub/
    index.html / index.tsx   # Entry point for the repos hub
tests/
  unit/
    branchService.test.ts
    gitService.test.ts
    urlUtils.test.ts
  __mocks__/
    styleMock.js
```

### Key design rules

- `branchService.ts` must remain free of runtime SDK/API imports so it can be unit-tested without mocking the ADO runtime. It may use `import type` from `gitService.ts` — type-only imports are erased at compile time and have no runtime effect.
- New hubs are added by appending to the `hubs` array in `webpack.config.js` and registering a contribution in `vss-extension.json`.
- Tests enforce a minimum **80% line coverage** threshold (`jest --coverage`).

## UI and azure-devops-ui Patterns

### Page layout

The root wrapper of every hub must carry the `bolt-page` class and `Page.css` must be imported for page-level layout rules to apply:

```tsx
import 'azure-devops-ui/Components/Page/Page.css';

<div className="bolt-page flex-grow flex-column">
```

The content area below the header uses:

```tsx
<div className="page-content page-content-top flex-grow flex-column">
```

- `page-content` gives 32px horizontal padding.
- `page-content-top` gives 16px top padding (needed because `Page.css` forces `padding-bottom: 0` on `.bolt-page > .bolt-header`).

### Header title with inline pill

Wrap the text in a `<span>` so both siblings are elements — CSS `:not(:first-child)` is unreliable when the first sibling is a raw text node:

```tsx
<div className="flex-row flex-center rhythm-horizontal-8">
  <span>My Branches</span>
  <Pill ...>{count}</Pill>
</div>
```

### Empty states

Do not use `ZeroData` for filter no-results or genuinely empty lists. Without an `imagePath` or `iconProps` it renders a broken image 160px tall with `title-l` (1.75rem bold) text. Use a simple centred message instead:

```tsx
<div className="flex-grow flex-column flex-center justify-center secondary-text body-l">
  {message}
</div>
```

### Table column sizing

Columns are sized to their content at render time using canvas text measurement. The helper `contentColumnWidth(header, values)` in `BranchTable.tsx`:

- Measures all data values and the header label using `CanvasRenderingContext2D.measureText`.
- Adds `COLUMN_EXTRA_WIDTH = 48px` to cover cell padding (24px) and header sort icon (~20px).
- Returns an uncapped pixel width — no artificial maximum — so content is never truncated unless the viewport is genuinely too narrow.
- Font used for measurement: `14px "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif`.

All cell links use class `mb-cell-link` (defined in `styles.css`) which sets `display: block`, `overflow: hidden`, `text-overflow: ellipsis`, and `white-space: nowrap`. Note that `ILinkProps` does not accept a `style` prop — use a CSS class for any display overrides.
