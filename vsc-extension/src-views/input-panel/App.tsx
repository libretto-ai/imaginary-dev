import React from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../shared/ExtensionState";
import { InputPanel } from "../shared/InputPanel";

const App = () => {
  return (
    <RecoilRoot>
      <ExtensionStateProvider>
        <InputPanel />
      </ExtensionStateProvider>
    </RecoilRoot>
  );
};

export default App;
