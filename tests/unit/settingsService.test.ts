import { loadBranchSettings, saveBranchSettings } from '../../src/common/settingsService';
import type { IExtensionDataManager } from 'azure-devops-extension-api/Common/CommonServices';
import { DEFAULT_BRANCH_SETTINGS } from '../../src/common/settingsTypes';

jest.mock('azure-devops-extension-sdk');
jest.mock('azure-devops-extension-api/Common/CommonServices');

function makeManager(overrides: Partial<IExtensionDataManager> = {}): IExtensionDataManager {
  return {
    getValue: jest.fn(),
    setValue: jest.fn(),
    getDocument: jest.fn(),
    getDocuments: jest.fn(),
    createDocument: jest.fn(),
    setDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    queryCollectionsByName: jest.fn(),
    queryCollections: jest.fn(),
    ...overrides,
  } as unknown as IExtensionDataManager;
}

const USER_SCOPE = { scopeType: 'User', scopeValue: 'me' };
const SETTINGS_KEY = 'branchExclusionSettings';

describe('loadBranchSettings', () => {
  it('returns DEFAULT_BRANCH_SETTINGS when getValue resolves with the default', async () => {
    const manager = makeManager({
      getValue: jest.fn().mockResolvedValue(DEFAULT_BRANCH_SETTINGS),
    });
    const result = await loadBranchSettings(manager);
    expect(result).toEqual(DEFAULT_BRANCH_SETTINGS);
  });

  it('returns DEFAULT_BRANCH_SETTINGS when getValue resolves with undefined', async () => {
    const manager = makeManager({
      getValue: jest.fn().mockResolvedValue(undefined),
    });
    const result = await loadBranchSettings(manager);
    expect(result).toEqual(DEFAULT_BRANCH_SETTINGS);
  });

  it('returns stored settings when getValue resolves with a value', async () => {
    const stored = { exclusionPatterns: ['dependabot/*', 'main'] };
    const manager = makeManager({
      getValue: jest.fn().mockResolvedValue(stored),
    });
    const result = await loadBranchSettings(manager);
    expect(result).toEqual(stored);
  });

  it('calls getValue with the correct key and user scope', async () => {
    const getValue = jest.fn().mockResolvedValue(DEFAULT_BRANCH_SETTINGS);
    const manager = makeManager({ getValue });
    await loadBranchSettings(manager);
    expect(getValue).toHaveBeenCalledWith(SETTINGS_KEY, expect.objectContaining(USER_SCOPE));
  });

  it('propagates a rejected promise from getValue', async () => {
    const manager = makeManager({
      getValue: jest.fn().mockRejectedValue(new Error('network error')),
    });
    await expect(loadBranchSettings(manager)).rejects.toThrow('network error');
  });
});

describe('saveBranchSettings', () => {
  it('calls setValue with the correct key, value, and user scope', async () => {
    const setValue = jest.fn().mockResolvedValue(undefined);
    const manager = makeManager({ setValue });
    const settings = { exclusionPatterns: ['release/*'] };
    await saveBranchSettings(manager, settings);
    expect(setValue).toHaveBeenCalledWith(SETTINGS_KEY, settings, USER_SCOPE);
  });

  it('propagates a rejected promise from setValue', async () => {
    const manager = makeManager({
      setValue: jest.fn().mockRejectedValue(new Error('storage error')),
    });
    await expect(saveBranchSettings(manager, { exclusionPatterns: [] })).rejects.toThrow('storage error');
  });
});
