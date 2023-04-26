import React, { Suspense } from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../components/ExtensionState";
import { InputPanel } from "../components/InputPanel";
import { RecoilSyncWebview } from "../components/RecoilSyncWebview";

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecoilRoot>
        <ExtensionStateProvider>
          <RecoilSyncWebview>
            <InputPanel />
          </RecoilSyncWebview>
        </ExtensionStateProvider>
      </RecoilRoot>
    </Suspense>
  );
};
export default App;
