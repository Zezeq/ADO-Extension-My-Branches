import type { GitRestClient, GitRef, GitCommit, GitRepository } from 'azure-devops-extension-api/Git';
import type { CoreRestClient, TeamProjectReference } from 'azure-devops-extension-api/Core';
import {
  getUserBranchesInRepo,
  getUserBranchesInProject,
  getUserBranchesAcrossOrg,
} from '../../src/common/gitService';

const USER = 'alice@example.com';

function makeRef(name: string, uniqueName: string, objectId = 'abc123'): GitRef {
  return {
    name,
    objectId,
    creator: { uniqueName, displayName: 'Alice', id: '' },
  } as unknown as GitRef;
}

function makeCommit(date: Date): GitCommit {
  return { author: { date, name: 'Alice', email: USER } } as unknown as GitCommit;
}

function makeRepo(id: string, name: string): GitRepository {
  return { id, name } as unknown as GitRepository;
}

function makeProject(name: string): TeamProjectReference {
  return { name, id: name } as unknown as TeamProjectReference;
}

const COMMIT_DATE = new Date('2024-03-10T10:00:00Z');

function makeMockGitClient(overrides: Partial<Record<string, jest.Mock>> = {}): GitRestClient {
  return {
    getRefs: jest.fn(),
    getCommit: jest.fn().mockResolvedValue(makeCommit(COMMIT_DATE)),
    getRepositories: jest.fn(),
    ...overrides,
  } as unknown as GitRestClient;
}

function makeMockCoreClient(projects: TeamProjectReference[]): CoreRestClient {
  return { getProjects: jest.fn().mockResolvedValue(projects) } as unknown as CoreRestClient;
}

describe('getUserBranchesInRepo', () => {
  it('returns branches created by the user with commit date', async () => {
    const gitClient = makeMockGitClient({
      getRefs: jest.fn().mockResolvedValue([
        makeRef('refs/heads/feature/mine', USER, 'sha-1'),
        makeRef('refs/heads/feature/theirs', 'other@example.com', 'sha-2'),
      ]),
    });

    const result = await getUserBranchesInRepo(gitClient, 'repo-1', 'my-repo', 'my-project', USER);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('feature/mine');
    expect(result[0].repositoryName).toBe('my-repo');
    expect(result[0].projectName).toBe('my-project');
    expect(result[0].lastCommitDate).toEqual(COMMIT_DATE);
  });

  it('returns empty array when user has no branches in the repo', async () => {
    const gitClient = makeMockGitClient({
      getRefs: jest.fn().mockResolvedValue([makeRef('refs/heads/main', 'other@example.com')]),
    });

    const result = await getUserBranchesInRepo(gitClient, 'repo-1', 'my-repo', 'project', USER);
    expect(result).toHaveLength(0);
  });

  it('sets lastCommitDate to undefined when getCommit fails', async () => {
    const gitClient = makeMockGitClient({
      getRefs: jest.fn().mockResolvedValue([makeRef('refs/heads/feature/x', USER, 'bad-sha')]),
      getCommit: jest.fn().mockRejectedValue(new Error('not found')),
    });

    const result = await getUserBranchesInRepo(gitClient, 'repo-1', 'my-repo', 'project', USER);
    expect(result[0].lastCommitDate).toBeUndefined();
  });
});

describe('getUserBranchesInProject', () => {
  it('aggregates branches across all repos in the project', async () => {
    const gitClient = makeMockGitClient({
      getRepositories: jest.fn().mockResolvedValue([makeRepo('r1', 'repo-a'), makeRepo('r2', 'repo-b')]),
      getRefs: jest.fn()
        .mockResolvedValueOnce([makeRef('refs/heads/feature/x', USER)])
        .mockResolvedValueOnce([makeRef('refs/heads/feature/y', USER)]),
    });

    const result = await getUserBranchesInProject(gitClient, 'my-project', USER);
    expect(result).toHaveLength(2);
    expect(result.map(b => b.repositoryName).sort()).toEqual(['repo-a', 'repo-b']);
  });

  it('returns empty array when no repos exist', async () => {
    const gitClient = makeMockGitClient({
      getRepositories: jest.fn().mockResolvedValue([]),
    });

    const result = await getUserBranchesInProject(gitClient, 'my-project', USER);
    expect(result).toHaveLength(0);
  });
});

describe('getUserBranchesAcrossOrg', () => {
  it('aggregates branches across all projects', async () => {
    const gitClient = makeMockGitClient({
      getRepositories: jest.fn().mockResolvedValue([makeRepo('r1', 'repo-a')]),
      getRefs: jest.fn().mockResolvedValue([makeRef('refs/heads/feature/x', USER)]),
    });
    const coreClient = makeMockCoreClient([makeProject('project-a'), makeProject('project-b')]);

    const result = await getUserBranchesAcrossOrg(gitClient, coreClient, USER);
    expect(result).toHaveLength(2);
    expect(result.map(b => b.projectName).sort()).toEqual(['project-a', 'project-b']);
  });

  it('returns empty array when no projects exist', async () => {
    const gitClient = makeMockGitClient();
    const coreClient = makeMockCoreClient([]);

    const result = await getUserBranchesAcrossOrg(gitClient, coreClient, USER);
    expect(result).toHaveLength(0);
  });
});
