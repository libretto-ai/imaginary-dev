import React from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../components/ExtensionState";
import { InputPanel } from "../components/InputPanel";
import { RecoilSyncWebview } from "../components/RecoilSyncWebview";

const App = () => {
  return (
    <RecoilRoot>
      <ExtensionStateProvider>
        <RecoilSyncWebview>
          <InputPanel />
        </RecoilSyncWebview>
      </ExtensionStateProvider>
    </RecoilRoot>
  );
};
export default App;
