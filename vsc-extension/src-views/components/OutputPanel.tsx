import React from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { findMatchingFunction } from "../../src-shared/source-info";
import {
  findTestCases,
  updateSourcefileTestCaseInput,
} from "../../src-shared/testcases";
import {
  selectedFunctionState,
  selectedTestCaseIndexState,
  sourcesState,
  testCasesState,
} from "../shared/state";
import { DebugPanel } from "./DebugPanel";
import { ParamEditor } from "./ParamEditor";
import { TestCasesList } from "./TestCasesList";

export function OutputPanel() {
  const sources = useRecoilValue(sourcesState);
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const [testIndex, setTestIndex] = useRecoilState(
    selectedTestCaseIndexState(selectedFunction)
  );

  const fn = findMatchingFunction(sources, selectedFunction);

  const onUpdateTestCase = (paramName: string, value: string) => {
    if (!selectedFunction) {
      return;
    }

    const { fileName, functionName } = selectedFunction;

    setTestCases((prevFileTestCases) => {
      return updateSourcefileTestCaseInput(
        prevFileTestCases,
        fileName,
        functionName,
        testIndex,
        paramName,
        value
      );
    });
  };

  const testCasesForSelectedFunction =
    findTestCases(
      testCases,
      selectedFunction?.fileName,
      selectedFunction?.functionName
    )?.testCases ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {!!fn && <code style={{ whiteSpace: "nowrap" }}>{fn.declaration}</code>}
      <div style={{ display: "flex", flexDirection: "row", gap: "1rem" }}>
        <TestCasesList
          testCases={testCasesForSelectedFunction}
          selectedFunction={selectedFunction}
          selectedIndex={testIndex}
          onSelect={setTestIndex}
        />
        <div
          style={{
            display: "grid",
            alignContent: "start",
            gridTemplateColumns: "auto 1fr 1fr 1fr",
            margin: "12px",
            minWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              gridColumnStart: 1,
              gridColumnEnd: 3,
              fontSize: 16,
              fontWeight: "bolder",
            }}
          >
            Inputs
          </div>
          <div style={{ fontSize: 16, fontWeight: "bolder" }}>
            Previous Outputs
          </div>
          <div style={{ fontSize: 16, fontWeight: "bolder" }}>Output</div>

          {!!testCasesForSelectedFunction[testIndex] &&
            Object.entries(testCasesForSelectedFunction[testIndex].inputs).map(
              ([paramName, paramValue], index) => (
                <>
                  <div style={{ margin: "6px" }}>{paramName}</div>
                  <div style={{ margin: "6px" }}>
                    <ParamEditor
                      value={paramValue}
                      onChange={(newValue) =>
                        onUpdateTestCase(paramName, newValue)
                      }
                    />
                    {/* {JSON.stringify(paramValue)} */}
                  </div>
                  {index === 0 && (
                    <>
                      <div
                        style={{
                          margin: "6px",
                          gridRow:
                            "2 / " +
                            testCasesForSelectedFunction[testIndex].inputs
                              .length +
                            2,
                          gridColumn: "3 / 4",
                        }}
                      >
                        <code style={{ whiteSpace: "pre" }}>
                          {formatOutput(
                            testCasesForSelectedFunction[testIndex].output.prev
                          )}
                        </code>
                      </div>
                      <div
                        style={{
                          margin: "6px",
                          gridRow:
                            "2 / " +
                            testCasesForSelectedFunction[testIndex].inputs
                              .length +
                            2,
                          gridColumn: "4 / 5",
                        }}
                      >
                        <code style={{ whiteSpace: "pre" }}>
                          {formatOutput(
                            testCasesForSelectedFunction[testIndex].output
                              .current
                          )}
                        </code>
                      </div>
                    </>
                  )}
                </>
              )
            )}
        </div>
      </div>
      <DebugPanel />
    </div>
  );
}

function formatOutput(value: any) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (value === null || value === undefined) {
    return "-";
  }
  return JSON.stringify(value, null, 2);
}
