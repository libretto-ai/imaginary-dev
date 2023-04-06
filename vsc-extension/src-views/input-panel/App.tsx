import React from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../shared/ExtensionState";
import { InputPanel } from "../shared/InputPanel";
import { RecoilSyncWebview } from "../shared/RecoilSyncWebview";

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
