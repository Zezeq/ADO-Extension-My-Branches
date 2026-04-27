import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useEffect, useState } from 'react';
import * as SDK from 'azure-devops-extension-sdk';
import type { ILocationService, IHostNavigationService } from 'azure-devops-extension-api/Common/CommonServices';
import { createAdoGitClient, createAdoCoreClient } from '../common/sdkClient';
import { getUserBranchesAcrossOrg } from '../common/gitService';
import type { BranchDetail } from '../common/gitService';
import { BranchTable, LoadingView, ErrorView } from '../common/BranchTable';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; branches: BranchDetail[]; collectionUri: string; navigate: (url: string) => void };

function App(): JSX.Element {
  const [view, setView] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    async function load(): Promise<void> {
      await SDK.init();
      await SDK.ready();

      const user = SDK.getUser();
      const locationService = await SDK.getService<ILocationService>('ms.vss-features.location-service');
      const collectionUri = await locationService.getServiceLocation();
      const navigationService = await SDK.getService<IHostNavigationService>('ms.vss-features.host-navigation-service');
      const gitClient = createAdoGitClient();
      const coreClient = createAdoCoreClient();
      const branches = await getUserBranchesAcrossOrg(gitClient, coreClient, user.name);

      setView({
        status: 'ready',
        branches,
        collectionUri,
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
      showProjectColumn={true}
      onNavigate={view.navigate}
    />
  );
}

ReactDOM.render(<App />, document.getElementById('app'));
