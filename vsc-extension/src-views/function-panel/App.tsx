import React, { Suspense } from "react";
import { RecoilRoot } from "recoil";
import { SWRConfig } from "swr";
import { ExtensionStateProvider } from "../components/ExtensionState";
import { OutputPanel } from "../components/OutputPanel";
import { RecoilSyncWebview } from "../components/RecoilSyncWebview";

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SWRConfig value={{ provider: () => new Map() }}>
        <RecoilRoot>
          <ExtensionStateProvider>
            <RecoilSyncWebview>
              <OutputPanel />
            </RecoilSyncWebview>
          </ExtensionStateProvider>
        </RecoilRoot>
      </SWRConfig>
    </Suspense>
  );
};

export default App;
