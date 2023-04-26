import React, { Suspense } from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../components/ExtensionState";
import { OutputPanel } from "../components/OutputPanel";
import { RecoilSyncWebview } from "../components/RecoilSyncWebview";

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecoilRoot>
        <ExtensionStateProvider>
          <RecoilSyncWebview>
            <OutputPanel />
          </RecoilSyncWebview>
        </ExtensionStateProvider>
      </RecoilRoot>
    </Suspense>
  );
};

export default App;
