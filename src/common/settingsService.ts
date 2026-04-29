import * as SDK from 'azure-devops-extension-sdk';
import { CommonServiceIds } from 'azure-devops-extension-api/Common/CommonServices';
import type { IExtensionDataService, IExtensionDataManager } from 'azure-devops-extension-api/Common/CommonServices';
import { BranchSettings, DEFAULT_BRANCH_SETTINGS } from './settingsTypes';

const SETTINGS_KEY = 'branchExclusionSettings';
const USER_SCOPE = { scopeType: 'User', scopeValue: 'me' };

export async function createExtensionDataManager(): Promise<IExtensionDataManager> {
  const dataService = await SDK.getService<IExtensionDataService>(CommonServiceIds.ExtensionDataService);
  return dataService.getExtensionDataManager(SDK.getExtensionContext().id, await SDK.getAccessToken());
}

export async function loadBranchSettings(manager: IExtensionDataManager): Promise<BranchSettings> {
  const stored = await manager.getValue<BranchSettings>(SETTINGS_KEY, {
    ...USER_SCOPE,
    defaultValue: DEFAULT_BRANCH_SETTINGS,
  });
  return stored ?? DEFAULT_BRANCH_SETTINGS;
}

export async function saveBranchSettings(manager: IExtensionDataManager, settings: BranchSettings): Promise<void> {
  await manager.setValue<BranchSettings>(SETTINGS_KEY, settings, USER_SCOPE);
}
