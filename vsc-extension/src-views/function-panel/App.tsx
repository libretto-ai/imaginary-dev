import React from "react";
import { RecoilRoot } from "recoil";
import { ExtensionStateProvider } from "../shared/ExtensionState";
import { OutputPanel } from "../shared/OutputPanel";

const App = () => {
  return (
    <RecoilRoot>
      <ExtensionStateProvider>
        <OutputPanel />
      </ExtensionStateProvider>
    </RecoilRoot>
  );
};

export default App;
