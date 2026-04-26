import * as SDK from 'azure-devops-extension-sdk';
import { getClient } from 'azure-devops-extension-api';
import { GitRestClient } from 'azure-devops-extension-api/Git';
import type { ILocationService, IHostNavigationService } from 'azure-devops-extension-api/Common/CommonServices';
import { getUserBranchesInProject, BranchDetail } from '../common/gitService';
import { formatTimeAgo, isStale, sortBranches, SortColumn, SortDirection } from '../common/branchService';
import { escapeHtml, attachRowClickHandlers } from '../common/domUtils';
import { branchUrl, repoBranchesUrl } from '../common/urlUtils';
import '../common/styles.css';

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

function sortableHeader(label: string, column: SortColumn, sort: SortState): string {
  const sortAttr = sort.column === column ? sort.direction : '';
  return `<th class="mb-sortable" data-column="${column}" data-sort="${sortAttr}">${label}</th>`;
}

function renderTable(branches: BranchDetail[], collectionUri: string, sort: SortState): string {
  const now = new Date();

  const rows = branches
    .map(b => {
      const stale = isStale(b.lastCommitDate, now);
      const updated = b.lastCommitDate ? formatTimeAgo(b.lastCommitDate, now) : '—';
      const rowHref = branchUrl(collectionUri, b.projectName, b.repositoryName, b.name);
      const repoHref = repoBranchesUrl(collectionUri, b.projectName, b.repositoryName);
      return `
        <tr class="mb-clickable-row" data-href="${escapeHtml(rowHref)}">
          <td><a class="mb-branch-name" href="${escapeHtml(rowHref)}" target="_top">${escapeHtml(b.name)}</a></td>
          <td><a class="mb-cell-link" href="${escapeHtml(repoHref)}" target="_top">${escapeHtml(b.repositoryName)}</a></td>
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
          ${sortableHeader('Branch', 'name', sort)}
          ${sortableHeader('Repository', 'repositoryName', sort)}
          ${sortableHeader('Last updated', 'lastCommitDate', sort)}
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
    const pageContext = SDK.getPageContext();
    const projectName = pageContext.webContext.project?.name;

    if (!projectName) {
      container.innerHTML = '<div class="mb-error">Could not determine the current project.</div>';
      return;
    }

    const locationService = await SDK.getService<ILocationService>('ms.vss-features.location-service');
    const collectionUri = await locationService.getServiceLocation();
    const gitClient = getClient(GitRestClient);
    const branches = await getUserBranchesInProject(gitClient, projectName, user.name);

    if (branches.length === 0) {
      container.innerHTML = '<div class="mb-empty">You have no branches in this project.</div>';
      return;
    }

    const navigationService = await SDK.getService<IHostNavigationService>('ms.vss-features.host-navigation-service');
    const sort: SortState = { column: 'lastCommitDate', direction: 'asc' };

    function render(): void {
      container.innerHTML = renderTable(sortBranches(branches, sort.column, sort.direction), collectionUri, sort);
      attachRowClickHandlers(container, url => navigationService.navigate(url));
      container.querySelectorAll<HTMLElement>('.mb-sortable').forEach(th => {
        th.addEventListener('click', () => {
          const column = th.dataset.column as SortColumn;
          sort.direction = sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc';
          sort.column = column;
          render();
        });
      });
    }

    render();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    container.innerHTML = `<div class="mb-error">Failed to load branches: ${escapeHtml(message)}</div>`;
  }
}

init().catch(console.error);
