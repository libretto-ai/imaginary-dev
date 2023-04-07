import React from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../components/ExtensionState";
import { OutputPanel } from "../components/OutputPanel";
import { RecoilSyncWebview } from "../components/RecoilSyncWebview";

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
