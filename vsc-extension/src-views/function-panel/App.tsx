/* eslint-disable @typescript-eslint/naming-convention */
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from "@vscode/webview-ui-toolkit/react";
import React, { useState } from "react";
import { RecoilRoot } from "recoil";
import {
  ExtensionStateProvider,
  useExtensionState,
} from "../shared/ExtensionState";

// eslint-disable-next-line @typescript-eslint/naming-convention
const App = () => {
  return (
    <RecoilRoot>
      <ExtensionStateProvider>
        <AppInternal />
      </ExtensionStateProvider>
    </RecoilRoot>
  );
};

function AppInternal() {
  const { sendMessage, sources, selectedFunction } = useExtensionState();

  const matchingSignatures = Object.values(sources)
    .flatMap((sourceFileInfo) =>
      sourceFileInfo.functions.map((fn) => {
        if (fn.name === selectedFunction?.functionName) {
          return fn.declaration;
        }
      })
    )
    .filter((s): s is string => !!s);
  const [debug, setDebug] = useState(false);

  return (
    <>
      {!!matchingSignatures.length && (
        <>
          <p>Function:</p>
          {matchingSignatures.map((signature) => (
            <code key="signature" style={{ whiteSpace: "nowrap" }}>
              {signature}
            </code>
          ))}
        </>
      )}
      <VSCodeDataGrid gridTemplateColumns="2fr 1fr 1fr" generateHeader="sticky">
        <VSCodeDataGridRow rowType="sticky-header">
          <VSCodeDataGridCell cellType="columnheader" gridColumn="1">
            Inputs
          </VSCodeDataGridCell>
          <VSCodeDataGridCell cellType="columnheader" gridColumn="2">
            Previous Outputs
          </VSCodeDataGridCell>
          <VSCodeDataGridCell cellType="columnheader" gridColumn="3">
            Output
          </VSCodeDataGridCell>
        </VSCodeDataGridRow>
      </VSCodeDataGrid>

      <VSCodeButton
        appearance="icon"
        onClick={() => setDebug((prevDebug) => !prevDebug)}
      >
        <span>🐛</span>
      </VSCodeButton>
      {debug && <pre>{JSON.stringify(sources, null, 4)}</pre>}
    </>
  );
}

export default App;
