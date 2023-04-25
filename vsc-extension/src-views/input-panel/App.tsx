import React, { Suspense } from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../components/ExtensionState";
import { InputPanel } from "../components/InputPanel";
import { RecoilSyncWebview } from "../components/RecoilSyncWebview";

import { SWRConfig } from "swr";

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SWRConfig value={{ provider: () => new Map() }}>
        <RecoilRoot>
          <ExtensionStateProvider>
            <RecoilSyncWebview>
              <InputPanel />
            </RecoilSyncWebview>
          </ExtensionStateProvider>
        </RecoilRoot>
      </SWRConfig>
    </Suspense>
  );
};
export default App;
