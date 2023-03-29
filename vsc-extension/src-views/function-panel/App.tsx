import React from "react";
import { RecoilRoot } from "recoil";

// eslint-disable-next-line @typescript-eslint/naming-convention
interface vscode {
  postMessage(message: any, transder: any[] | undefined): void;
}
declare function acquireVsCodeApi(): vscode;

const App = () => {
  return (
    <RecoilRoot>
      <p>This is react running in a webview</p>
    </RecoilRoot>
  );
};

export default App;
