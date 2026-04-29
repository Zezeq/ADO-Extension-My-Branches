import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useEffect, useState } from 'react';
import * as SDK from 'azure-devops-extension-sdk';
import type { ILocationService, IHostNavigationService, IProjectPageService } from 'azure-devops-extension-api/Common/CommonServices';
import type { IExtensionDataManager } from 'azure-devops-extension-api/Common/CommonServices';
import { createAdoGitClient } from '../common/sdkClient';
import { getUserBranchesInProject } from '../common/gitService';
import type { BranchDetail } from '../common/gitService';
import { BranchTable, LoadingView, ErrorView } from '../common/BranchTable';
import { createExtensionDataManager, loadBranchSettings, saveBranchSettings } from '../common/settingsService';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; branches: BranchDetail[]; collectionUri: string; exclusionPatterns: string[]; dataManager: IExtensionDataManager; navigate: (url: string) => void };

function App(): JSX.Element {
  const [view, setView] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    async function load(): Promise<void> {
      await SDK.init();
      await SDK.ready();

      const user = SDK.getUser();
      const projectService = await SDK.getService<IProjectPageService>('ms.vss-tfs-web.tfs-page-data-service');
      const project = await projectService.getProject();
      const projectName = project?.name;

      if (!projectName) {
        setView({ status: 'error', message: 'Could not determine the current project.' });
        return;
      }

      const locationService = await SDK.getService<ILocationService>('ms.vss-features.location-service');
      const collectionUri = await locationService.getServiceLocation();
      const navigationService = await SDK.getService<IHostNavigationService>('ms.vss-features.host-navigation-service');
      const gitClient = createAdoGitClient();
      const [branches, dataManager] = await Promise.all([
        getUserBranchesInProject(gitClient, projectName, user.name),
        createExtensionDataManager(),
      ]);
      const settings = await loadBranchSettings(dataManager);

      setView({
        status: 'ready',
        branches,
        collectionUri,
        exclusionPatterns: settings.exclusionPatterns,
        dataManager,
        navigate: url => navigationService.navigate(url),
      });
    }

    load().catch(err => {
      const message = err instanceof Error ? err.message : String(err);
      setView({ status: 'error', message: `Failed to load branches: ${message}` });
    });
  }, []);

  if (view.status === 'loading') return <LoadingView />;
  if (view.status === 'error') return <ErrorView message={view.message} />;
  return (
    <BranchTable
      branches={view.branches}
      collectionUri={view.collectionUri}
      showProjectColumn={false}
      exclusionPatterns={view.exclusionPatterns}
      onNavigate={view.navigate}
      onSettingsChange={async patterns => {
        await saveBranchSettings(view.dataManager, { exclusionPatterns: patterns });
        setView({ ...view, exclusionPatterns: patterns });
      }}
    />
  );
}

ReactDOM.render(<App />, document.getElementById('app'));
