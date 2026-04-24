import {
  filterUserBranches,
  isBranchOwnedByUser,
  toBranchInfo,
  shortBranchName,
  formatTimeAgo,
  isStale,
  BranchRef,
  Repository,
} from '../../src/common/branchService';

const repo: Repository = { id: 'repo-1', name: 'my-repo' };

function makeBranch(refName: string, uniqueName: string, displayName = 'Test User'): BranchRef {
  return { name: refName, creator: { uniqueName, displayName } };
}

const NOW = new Date('2024-06-15T12:00:00Z');

describe('shortBranchName', () => {
  it('strips refs/heads/ prefix', () => {
    expect(shortBranchName('refs/heads/feature/my-branch')).toBe('feature/my-branch');
  });

  it('leaves names without the prefix unchanged', () => {
    expect(shortBranchName('main')).toBe('main');
  });
});

describe('isBranchOwnedByUser', () => {
  it('returns true when creator uniqueName matches', () => {
    expect(isBranchOwnedByUser(makeBranch('refs/heads/x', 'user@example.com'), 'user@example.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isBranchOwnedByUser(makeBranch('refs/heads/x', 'User@Example.COM'), 'user@example.com')).toBe(true);
  });

  it('returns false when creator uniqueName does not match', () => {
    expect(isBranchOwnedByUser(makeBranch('refs/heads/x', 'other@example.com'), 'user@example.com')).toBe(false);
  });
});

describe('toBranchInfo', () => {
  it('maps a BranchRef to BranchInfo correctly', () => {
    const result = toBranchInfo(makeBranch('refs/heads/feature/x', 'user@example.com', 'Alice'), repo, 'my-project');

    expect(result).toEqual({
      name: 'feature/x',
      repositoryId: 'repo-1',
      repositoryName: 'my-repo',
      projectName: 'my-project',
      creatorDisplayName: 'Alice',
    });
  });
});

describe('filterUserBranches', () => {
  const userEmail = 'user@example.com';
  const branches: BranchRef[] = [
    makeBranch('refs/heads/feature/mine', userEmail),
    makeBranch('refs/heads/feature/theirs', 'other@example.com'),
    makeBranch('refs/heads/bugfix/mine-too', userEmail),
  ];

  it('returns only branches created by the given user', () => {
    const result = filterUserBranches(branches, repo, 'project', userEmail);
    expect(result).toHaveLength(2);
    expect(result.map(b => b.name)).toEqual(['feature/mine', 'bugfix/mine-too']);
  });

  it('returns empty array when no branches match', () => {
    expect(filterUserBranches(branches, repo, 'project', 'nobody@example.com')).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterUserBranches([], repo, 'project', userEmail)).toHaveLength(0);
  });

  it('attaches repository and project metadata to each result', () => {
    const result = filterUserBranches([makeBranch('refs/heads/main', userEmail)], repo, 'alpha-project', userEmail);
    expect(result[0].repositoryId).toBe('repo-1');
    expect(result[0].repositoryName).toBe('my-repo');
    expect(result[0].projectName).toBe('alpha-project');
  });
});

describe('formatTimeAgo', () => {
  it('returns "today" for the same day', () => {
    expect(formatTimeAgo(new Date('2024-06-15T08:00:00Z'), NOW)).toBe('today');
  });

  it('returns "yesterday" for 1 day ago', () => {
    expect(formatTimeAgo(new Date('2024-06-14T12:00:00Z'), NOW)).toBe('yesterday');
  });

  it('returns "N days ago" for 2-6 days', () => {
    expect(formatTimeAgo(new Date('2024-06-12T12:00:00Z'), NOW)).toBe('3 days ago');
  });

  it('returns "1 week ago" for 7-13 days', () => {
    expect(formatTimeAgo(new Date('2024-06-08T12:00:00Z'), NOW)).toBe('1 week ago');
  });

  it('returns "N weeks ago" for 14-29 days', () => {
    expect(formatTimeAgo(new Date('2024-05-25T12:00:00Z'), NOW)).toBe('3 weeks ago');
  });

  it('returns "1 month ago" for 30-59 days', () => {
    expect(formatTimeAgo(new Date('2024-04-20T12:00:00Z'), NOW)).toBe('1 month ago');
  });

  it('returns "N months ago" for 60-364 days', () => {
    expect(formatTimeAgo(new Date('2024-01-15T12:00:00Z'), NOW)).toBe('5 months ago');
  });

  it('returns "1 year ago" for 365-729 days', () => {
    expect(formatTimeAgo(new Date('2023-06-15T12:00:00Z'), NOW)).toBe('1 year ago');
  });

  it('returns "N years ago" for 730+ days', () => {
    expect(formatTimeAgo(new Date('2022-01-01T12:00:00Z'), NOW)).toBe('2 years ago');
  });
});

describe('isStale', () => {
  it('returns false when date is undefined', () => {
    expect(isStale(undefined, NOW)).toBe(false);
  });

  it('returns false when date is within the threshold', () => {
    const recent = new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000);
    expect(isStale(recent, NOW)).toBe(false);
  });

  it('returns true when date exceeds the default 30-day threshold', () => {
    const old = new Date(NOW.getTime() - 31 * 24 * 60 * 60 * 1000);
    expect(isStale(old, NOW)).toBe(true);
  });

  it('respects a custom threshold', () => {
    const date = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
    expect(isStale(date, NOW, 7)).toBe(true);
    expect(isStale(date, NOW, 14)).toBe(false);
  });
});
