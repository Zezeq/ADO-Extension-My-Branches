export interface BranchSettings {
  exclusionPatterns: string[];
}

export const DEFAULT_BRANCH_SETTINGS: BranchSettings = {
  exclusionPatterns: [],
};
