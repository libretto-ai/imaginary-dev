import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from "@vscode/webview-ui-toolkit/react";
import React, { useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  FunctionTestCase,
  FunctionTestCases,
} from "../../src-shared/source-info";
import { findMatchingFunction } from "../../src/util/serialized-source";
import {
  debugState,
  selectedFunctionState,
  selectedTestCaseIndexState,
  selectedTestCaseState,
  sourcesState,
  testCasesState,
} from "../shared/state";

// TestCasesList component
function TestCasesList({
  testCases,
  selectedIndex,
  onSelect,
}: {
  testCases: FunctionTestCase[];
  selectedIndex: number | null;
  onSelect: (selectedIndex: number) => void;
}) {
  return (
    <div className="input-scenarios-list" style={{ minWidth: "120px" }}>
      {testCases.map((testCase, index) => (
        <div
          key={index}
          style={{
            marginBottom: 10,
            fontWeight: "bold",
            fontSize: "15px",
            cursor: "pointer",
            backgroundColor:
              index === selectedIndex
                ? "var(--list-active-selection-background)"
                : "",
            border:
              index === selectedIndex
                ? "solid calc(var(--border-width) * 1px) var(--focus-border)"
                : "1px solid gray",
            padding: "5px",
            borderRadius: "5px",
          }}
          onClick={() => onSelect(index)}
        >
          {testCase.name}
        </div>
      ))}
    </div>
  );
}

export function OutputPanel() {
  const sources = useRecoilValue(sourcesState);
  const testCases = useRecoilValue(testCasesState);
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const selectedTestCaseIndexes = useRecoilValue(selectedTestCaseState);
  const [testIndex, setTestIndex] = useRecoilState(
    selectedTestCaseIndexState(selectedFunction)
  );

  const fn = findMatchingFunction(sources, selectedFunction);
  const [debug, setDebug] = useRecoilState(debugState);

  const testCasesForSelectedFunction = Object.values(testCases)
    .flatMap((cases) => cases.functionTestCases)
    .filter((cases) => cases.functionName === selectedFunction?.functionName)
    .flatMap((cases) => cases.testCases);

  return (
    <>
      {!!fn && (
        <>
          <p>Function:</p>
          <code style={{ whiteSpace: "nowrap" }}>{fn.declaration}</code>
        </>
      )}
      <div style={{ display: "flex", flexDirection: "row" }}>
        <TestCasesList
          testCases={testCasesForSelectedFunction}
          selectedIndex={testIndex}
          onSelect={setTestIndex}
        />{" "}
        <VSCodeDataGrid
          gridTemplateColumns="2fr 1fr 1fr"
          generateHeader="sticky"
        >
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
          <VSCodeDataGridRow>
            <VSCodeDataGridCell gridColumn="1">
              {!!testCasesForSelectedFunction[testIndex] && (
                <VSCodeDataGrid>
                  {Object.entries(
                    testCasesForSelectedFunction[testIndex].inputs
                  ).map(([paramName, paramValue], index) => (
                    <VSCodeDataGridRow key={index}>
                      <VSCodeDataGridCell gridColumn="1">
                        {paramName}
                      </VSCodeDataGridCell>
                      <VSCodeDataGridCell gridColumn="2">
                        {JSON.stringify(paramValue)}
                      </VSCodeDataGridCell>
                    </VSCodeDataGridRow>
                  ))}
                </VSCodeDataGrid>
              )}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2">
              {/* {testCasesForSelectedFunction[testIndex].output.current} */}
              OUTPUT
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>
        </VSCodeDataGrid>
      </div>
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
