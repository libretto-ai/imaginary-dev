import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from "@vscode/webview-ui-toolkit/react";
import React from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { findMatchingFunction } from "../../src-shared/serialized-source";
import {
  debugState,
  selectedFunctionState,
  selectedTestCaseState,
  sourcesState,
  testCasesState,
} from "../shared/state";

export function OutputPanel() {
  const sources = useRecoilValue(sourcesState);
  const testCases = useRecoilValue(testCasesState);
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const selectedTestCaseIndexes = useRecoilValue(selectedTestCaseState);

  const fn = findMatchingFunction(sources, selectedFunction);
  const [debug, setDebug] = useRecoilState(debugState);

  return (
    <>
      {!!fn && (
        <>
          <p>Function:</p>
          <code style={{ whiteSpace: "nowrap" }}>{fn.declaration}</code>
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
      {debug && (
        <div>
          <p>Functions</p>
          <pre>{JSON.stringify(sources, null, 4)}</pre>
          <p>SelectedFunction</p>
          <pre>{JSON.stringify(selectedFunction, null, 4)}</pre>
          <p>Inputs/Outputs</p>
          <pre>{JSON.stringify(testCases, null, 4)}</pre>
          <p>TestCaseIndexes</p>
          <pre>{JSON.stringify(selectedTestCaseIndexes, null, 4)}</pre>
        </div>
      )}
    </>
  );
}
