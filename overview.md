# My Branches

Quickly find the branches you created — without scrolling through every branch in every repository.

## What you get

After installing, two new **My Branches** tabs appear automatically in your Azure DevOps interface — no configuration required.

### Organisation / collection view

A tab on your organisation or collection start page lists **all branches you created across every project and repository** you have access to. Each row shows:

- **Branch name** — links directly to the branch in Azure Repos.
- **Repository** — links to the branch list for that repository.
- **Project** — links to the project home page.
- **Last updated** — human-readable time since the last commit (e.g. "3 days ago", "2 months ago"). Branches with no activity in over 30 days are highlighted in red so stale work is easy to spot.

### Project / Repos view

A tab under **Repos** inside each project shows the same information scoped to that project only — useful when you want to stay focused on the work at hand.

## Features

**Filter** — type any part of a branch name to narrow the list instantly. Use `*` as a wildcard to match patterns (e.g. `feature/*` shows all your feature branches).

**Sort** — click any column header to sort ascending or descending by branch name, repository, project, or last updated date.

**Stale branch detection** — branches whose last commit is older than 30 days are highlighted in red, making it easy to identify work that may need attention or cleanup.

**Accurate ownership** — a branch belongs to whoever pushed it into existence, not whoever made the most recent commit. Cherry-picks and rebases do not affect which branches appear in your list.

## How it works

The extension identifies you using your current Azure DevOps session — no additional sign-in or token is required. It queries the Git refs API (`Code (read)` scope only) and filters branches where the `creator` field matches your identity.

## Compatibility

| Environment | Supported |
|---|---|
| Azure DevOps Services (cloud) | ✓ |
| Azure DevOps Server (on-premises) | ✓ |

## Feedback and issues

Found a bug or have a suggestion? Open an issue on [GitHub](https://github.com/CrazySolutions/ADO-Extension-My-Branches/issues).
