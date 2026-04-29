export interface IdentityRef {
  uniqueName: string;
  displayName: string;
}

// Matches the GitRef shape returned by GET .../refs?filter=heads/
export interface BranchRef {
  name: string;       // full ref name, e.g. refs/heads/feature/x
  creator: IdentityRef;
}

export interface Repository {
  id: string;
  name: string;
}

export interface BranchInfo {
  name: string;
  repositoryId: string;
  repositoryName: string;
  projectName: string;
  creatorDisplayName: string;
}

export function shortBranchName(refName: string): string {
  return refName.replace(/^refs\/heads\//, '');
}

export function isBranchOwnedByUser(branch: BranchRef, userUniqueName: string): boolean {
  return branch.creator.uniqueName.toLowerCase() === userUniqueName.toLowerCase();
}

export function toBranchInfo(branch: BranchRef, repository: Repository, projectName: string): BranchInfo {
  return {
    name: shortBranchName(branch.name),
    repositoryId: repository.id,
    repositoryName: repository.name,
    projectName,
    creatorDisplayName: branch.creator.displayName,
  };
}

import type { BranchDetail } from './gitService';

export type SortColumn = 'name' | 'repositoryName' | 'projectName' | 'lastCommitDate';
export type SortDirection = 'asc' | 'desc';

export function sortBranches(
  branches: BranchDetail[],
  column: SortColumn,
  direction: SortDirection
): BranchDetail[] {
  return [...branches].sort((a, b) => {
    let cmp: number;
    if (column === 'lastCommitDate') {
      cmp = (a.lastCommitDate?.getTime() ?? 0) - (b.lastCommitDate?.getTime() ?? 0);
    } else {
      cmp = a[column].localeCompare(b[column]);
    }
    if (cmp === 0 && column !== 'name') {
      cmp = a.name.localeCompare(b.name);
    }
    return direction === 'asc' ? cmp : -cmp;
  });
}

function matchesPattern(name: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = pattern.includes('*')
    ? `^${escaped.replace(/\*/g, '.*')}$`
    : escaped;
  return new RegExp(regexStr, 'i').test(name);
}

export function filterBranches(branches: BranchDetail[], pattern: string): BranchDetail[] {
  if (!pattern.trim()) return branches;
  return branches.filter(b => matchesPattern(b.name, pattern));
}

export function applyExclusionPatterns(branches: BranchDetail[], exclusionPatterns: string[]): BranchDetail[] {
  if (exclusionPatterns.length === 0) return branches;
  return branches.filter(b => !exclusionPatterns.some(p => matchesPattern(b.name, p)));
}

export function filterUserBranches(
  branches: BranchRef[],
  repository: Repository,
  projectName: string,
  userUniqueName: string
): BranchInfo[] {
  return branches
    .filter(b => isBranchOwnedByUser(b, userUniqueName))
    .map(b => toBranchInfo(b, repository, projectName));
}

export function formatTimeAgo(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  if (diffDays < 730) return '1 year ago';
  return `${Math.floor(diffDays / 365)} years ago`;
}

// A branch is considered stale when its last commit is older than thresholdDays.
export function isStale(date: Date | undefined, now: Date = new Date(), thresholdDays = 30): boolean {
  if (!date) return false;
  return (now.getTime() - date.getTime()) > thresholdDays * 24 * 60 * 60 * 1000;
}
