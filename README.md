# My Branches

An Azure DevOps extension that shows all branches you created — across your entire organisation or scoped to a single project — without scrolling through every branch in every repository.

## Features

- **Organisation view** — a dedicated tab on the organisation/collection start page lists all your branches across every project and repository you have access to.
- **Project view** — a dedicated tab under Repos inside each project lists your branches for that project only.
- **Accurate ownership** — based on who pushed the branch into existence, not who made the latest commit.
- **Filter and sort** — filter by name (supports `*` wildcards) and sort by any column.
- **Cloud and on-premises** — works with both Azure DevOps Services and Azure DevOps Server.

## Prerequisites

- [Node.js 22](https://nodejs.org/)
- [tfx-cli](https://github.com/microsoft/tfs-cli) (installed automatically via `npm ci`)

## Getting started

```bash
git clone https://github.com/CrazySolutions/ADO-Extension-My-Branches.git
cd ADO-Extension-My-Branches
npm ci
```

## Development

| Command | Purpose |
|---|---|
| `npm run watch` | Incremental dev build on file change |
| `npm run build:dev` | One-off development build with source maps |
| `npm run build` | Production build → `dist/` |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage report (80% line threshold) |

## Building and packaging

The project produces two extension variants from the same codebase:

| Variant | Extension ID | Visibility | Purpose |
|---|---|---|---|
| Production | `my-branches` | Public | Marketplace release |
| Dev | `my-branches-dev` | Private | Verification installs alongside production |

**Package production VSIX:**
```bash
npx tfx extension create --manifest-globs vss-extension.json --no-prompt
```

**Package dev VSIX:**
```bash
npx tfx extension create --manifest-globs vss-extension.json --overrides-file vss-extension.dev.json --no-prompt
```

Because the extension IDs differ, both variants can be installed in the same ADO organisation simultaneously.

## CI / CD

Every push and pull request runs the full pipeline (test → build → package):

- **PR builds** produce a dev VSIX only. The version is `major.minor.patch.run_number`, which is always higher than the current main release so it can be installed on top for verification.
- **Main and tag builds** produce both a dev VSIX and a prod VSIX. The version is `major.minor.patch`.

Artifacts are downloadable from the GitHub Actions run summary.

## Publishing

Publishing is manual. After a main or tag CI run:

1. Download the prod VSIX artifact from the GitHub Actions run.
2. Go to [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage).
3. Upload the `.vsix` file for the **CrazySolutions** publisher.

## Versioning

Versions are calculated automatically by CI — do not edit `vss-extension.json` by hand.

- `major.minor` comes from the most recent git tag (`v1.2` → `1.2`). Defaults to `0.1` if no tag exists.
- `patch` is the number of commits on `main` since that tag.

To start a new major or minor version, tag the commit where it should begin:

```bash
git tag v1.0
git push origin v1.0
```

This triggers CI immediately and produces version `1.0.0`.

## Project structure

```
src/
  common/
    BranchTable.tsx    # Shared React UI component
    branchService.ts   # Pure business logic (ownership, sort, filter)
    gitService.ts      # ADO Git API calls
    sdkClient.ts       # SDK init and API client factory
    urlUtils.ts        # ADO URL builders
    styles.css         # Shared styles
  declarations.d.ts    # Module declarations (e.g. CSS imports)
  org-hub/             # Organisation/collection hub entry point
  repos-hub/           # Project Repos hub entry point
tests/
  unit/                # Jest unit tests
```

## Contributing

See [CLAUDE.md](CLAUDE.md) for architecture decisions, coding standards, commit message conventions, and UI patterns.

## Feedback and issues

Found a bug or have a suggestion? Open an issue on [GitHub](https://github.com/CrazySolutions/ADO-Extension-My-Branches/issues).

## License

See [LICENSE](LICENSE).
