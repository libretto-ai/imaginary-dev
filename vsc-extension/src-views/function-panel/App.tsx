import React from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../shared/ExtensionState";
import { OutputPanel } from "../shared/OutputPanel";
import { RecoilSyncWebview } from "../shared/RecoilSyncWebview";

const App = () => {
  return (
    <RecoilRoot>
      <ExtensionStateProvider>
        <RecoilSyncWebview>
          <OutputPanel />
        </RecoilSyncWebview>
      </ExtensionStateProvider>
    </RecoilRoot>
  );
};

export default App;
