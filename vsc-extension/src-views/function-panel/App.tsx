/* eslint-disable @typescript-eslint/naming-convention */
import {
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from "@vscode/webview-ui-toolkit/react";
import React, { useEffect, useState } from "react";
import { RecoilRoot } from "recoil";
import {
  MaybeSelectedFunction,
  SerializableSourceFileMap,
} from "../../src-shared/source-info";

// eslint-disable-next-line @typescript-eslint/naming-convention
const App = () => {
  const [sources, setSources] = useState<SerializableSourceFileMap>({});
  const [selectedFunction, setSelectedFunction] =
    useState<MaybeSelectedFunction>(null);
  const matchingSignatures = Object.values(sources)
    .flatMap((sourceFileInfo) =>
      sourceFileInfo.functions.map((fn) => {
        if (fn.name === selectedFunction?.functionName) {
          return fn.declaration;
        }
      })
    )
    .filter((s): s is string => !!s);
  useEffect(() => {
    window.addEventListener("message", (event) => {
      switch (event.data.id as string) {
        case "update-sources": {
          const [sources] = event.data.params as [
            sources: SerializableSourceFileMap
          ];
          console.log("got sources: ", sources);
          setSources(sources);
          break;
        }
        case "update-selection": {
          const [selection] = event.data.params as [
            selection: MaybeSelectedFunction
          ];
          setSelectedFunction(selection);
        }
        default:
          console.log("Unknmown message: ", event);
      }
    });
  }, []);
  return (
    <RecoilRoot>
      {!!matchingSignatures.length && (
        <>
          <p>Function:</p>
          {matchingSignatures.map((signature) => (
            <code key="signature">{signature}</code>
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
      <pre>{JSON.stringify(sources, null, 4)}</pre>
    </RecoilRoot>
  );
};

export default App;
