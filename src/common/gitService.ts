import type { GitRestClient, GitRef } from 'azure-devops-extension-api/Git';
import type { CoreRestClient } from 'azure-devops-extension-api/Core';
import { shortBranchName } from './branchService';

export interface BranchDetail {
  name: string;
  repositoryId: string;
  repositoryName: string;
  projectName: string;
  lastCommitDate: Date | undefined;
}

// Fetches refs for a single repo and filters to those created by the given user.
async function getUserRefsInRepo(
  gitClient: GitRestClient,
  repoId: string,
  projectName: string,
  userUniqueName: string
): Promise<GitRef[]> {
  const refs = await gitClient.getRefs(repoId, projectName, 'heads/');
  return refs.filter(
    ref => ref.creator?.uniqueName?.toLowerCase() === userUniqueName.toLowerCase()
  );
}

// Fetches the author date of the commit that a ref's objectId points to.
async function getCommitDate(
  gitClient: GitRestClient,
  objectId: string,
  repoId: string,
  projectName: string
): Promise<Date | undefined> {
  try {
    const commit = await gitClient.getCommit(objectId, repoId, projectName);
    return commit.author?.date;
  } catch {
    return undefined;
  }
}

export async function getUserBranchesInRepo(
  gitClient: GitRestClient,
  repoId: string,
  repoName: string,
  projectName: string,
  userUniqueName: string
): Promise<BranchDetail[]> {
  const userRefs = await getUserRefsInRepo(gitClient, repoId, projectName, userUniqueName);

  return Promise.all(
    userRefs.map(async ref => ({
      name: shortBranchName(ref.name),
      repositoryId: repoId,
      repositoryName: repoName,
      projectName,
      lastCommitDate: await getCommitDate(gitClient, ref.objectId, repoId, projectName),
    }))
  );
}

export async function getUserBranchesInProject(
  gitClient: GitRestClient,
  projectName: string,
  userUniqueName: string
): Promise<BranchDetail[]> {
  const repos = await gitClient.getRepositories(projectName);
  const results = await Promise.all(
    repos.map(repo => getUserBranchesInRepo(gitClient, repo.id!, repo.name!, projectName, userUniqueName))
  );
  return results.flat();
}

export async function getUserBranchesAcrossOrg(
  gitClient: GitRestClient,
  coreClient: CoreRestClient,
  userUniqueName: string
): Promise<BranchDetail[]> {
  const projects = await coreClient.getProjects();
  const results = await Promise.all(
    projects.map(project => getUserBranchesInProject(gitClient, project.name!, userUniqueName))
  );
  return results.flat();
}
