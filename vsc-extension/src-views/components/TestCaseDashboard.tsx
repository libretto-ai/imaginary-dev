import React, { FC, ReactNode } from "react";
import { useRecoilState } from "recoil";
import {
  SelectedFunction,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import {
  blankTestCase,
  findTestCases,
  updateSourceFileTestCase,
} from "../../src-shared/testcases";
import { selectedTestCaseIndexState, testCasesState } from "../shared/state";
import { ParamEditor } from "./ParamEditor";
import { TestCasesList } from "./TestCasesList";

interface Props {
  fn: SerializableFunctionDeclaration;
  selectedFunction: SelectedFunction;
}

export const TestCaseDashboard: FC<Props> = ({ fn, selectedFunction }) => {
  const [testIndex, setTestIndex] = useRecoilState(
    selectedTestCaseIndexState(selectedFunction)
  );
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const testCasesForSelectedFunction =
    findTestCases(
      testCases,
      selectedFunction?.fileName,
      selectedFunction?.functionName
    )?.testCases ?? [];

  const onUpdateTestCase = (paramName: string, value: string) => {
    const { fileName, functionName } = selectedFunction;

    setTestCases((prevFileTestCases) => {
      return updateSourceFileTestCase(
        prevFileTestCases,
        fileName,
        functionName,
        testIndex,
        (prevTestCase) => ({
          ...blankTestCase,
          ...prevTestCase,
          inputs: {
            ...prevTestCase?.inputs,
            [paramName]: value,
          },
        })
      );
    });
  };
  const formattedDeclaration = fn.declaration
    .split(new RegExp(`\\b${fn.name}\\b`))
    .flatMap<ReactNode>((segment, index) => {
      if (index === 0) {
        return [
          <span data-index={index} key={index}>
            {segment}
          </span>,
        ];
      }
      return [
        <b data-index={index} key={`${index}-fn`}>
          {fn.name}
        </b>,
        <span data-index={index} key={index}>
          {segment}
        </span>,
      ];
    });
  return (
    <>
      {!!fn && (
        <code style={{ whiteSpace: "nowrap" }}>{formattedDeclaration}</code>
      )}
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
            gridTemplateColumns: "auto 1fr 1fr",
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
              position: "sticky",
              top: 0,
              backgroundColor: "var(--background)",
            }}
          >
            Inputs
          </div>
          {/* <div style={{ fontSize: 16, fontWeight: "bolder" }}>
          Previous Outputs
        </div> */}
          <div
            style={{
              fontSize: 16,
              fontWeight: "bolder",
              position: "sticky",
              top: 0,
              backgroundColor: "var(--background)",
            }}
          >
            Output
          </div>

          {!!testCasesForSelectedFunction[testIndex] &&
            Object.entries(testCasesForSelectedFunction[testIndex].inputs).map(
              ([paramName, paramValue], index) => (
                <>
                  <div
                    style={{
                      margin: "6px",
                      position: "sticky",
                      top: "1.5rem",
                      background: "var(--background)",
                    }}
                  >
                    {paramName}
                  </div>
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
                      {/* <div
                                        style={{
                                          margin: "6px",
                                          gridRow: `2 / ${
                                            Object.entries(
                                              testCasesForSelectedFunction[testIndex].inputs
                                            ).length + 2
                                          }`,
                                          gridColumn: "3 / 4",
                                          overflow: "scroll",
                                        }}
                                      >
                                        <code style={{ whiteSpace: "pre" }}>
                                          {formatOutput(
                                            testCasesForSelectedFunction[testIndex].output.prev
                                          )}
                                        </code>
                                      </div> */}
                      <div
                        style={{
                          margin: "6px",
                          gridRow: `2 / ${
                            Object.entries(
                              testCasesForSelectedFunction[testIndex].inputs
                            ).length + 2
                          }`,
                          gridColumn: "3 / 4",
                          overflow: "scroll",
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
    </>
  );
};

export function formatOutput(value: any) {
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
