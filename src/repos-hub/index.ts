import * as SDK from 'azure-devops-extension-sdk';
import { getClient } from 'azure-devops-extension-api';
import { GitRestClient } from 'azure-devops-extension-api/Git';
import { getUserBranchesInProject, BranchDetail } from '../common/gitService';
import { formatTimeAgo, isStale } from '../common/branchService';
import { escapeHtml } from '../common/domUtils';
import '../common/styles.css';

function renderTable(branches: BranchDetail[]): string {
  const now = new Date();

  const rows = branches
    .sort((a, b) => (b.lastCommitDate?.getTime() ?? 0) - (a.lastCommitDate?.getTime() ?? 0))
    .map(b => {
      const stale = isStale(b.lastCommitDate, now);
      const updated = b.lastCommitDate ? formatTimeAgo(b.lastCommitDate, now) : '—';
      return `
        <tr>
          <td><span class="mb-branch-name">${escapeHtml(b.name)}</span></td>
          <td>${escapeHtml(b.repositoryName)}</td>
          <td class="${stale ? 'mb-stale' : ''}">${escapeHtml(updated)}</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="mb-header">
      <h1>My Branches</h1>
      <span class="mb-count">${branches.length}</span>
    </div>
    <table class="mb-table">
      <thead>
        <tr>
          <th>Branch</th>
          <th>Repository</th>
          <th>Last updated</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function init(): Promise<void> {
  await SDK.init();
  await SDK.ready();

  const container = document.getElementById('app')!;
  container.innerHTML = '<div class="mb-loading">Loading your branches…</div>';

  try {
    const user = SDK.getUser();
    const projectName = SDK.getPageContext().webContext.project?.name;

    if (!projectName) {
      container.innerHTML = '<div class="mb-error">Could not determine the current project.</div>';
      return;
    }

    const gitClient = getClient(GitRestClient);
    const branches = await getUserBranchesInProject(gitClient, projectName, user.name);

    container.innerHTML = branches.length === 0
      ? '<div class="mb-empty">You have no branches in this project.</div>'
      : renderTable(branches);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    container.innerHTML = `<div class="mb-error">Failed to load branches: ${escapeHtml(message)}</div>`;
  }
}

init().catch(console.error);
