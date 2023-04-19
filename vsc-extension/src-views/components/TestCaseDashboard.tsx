import React, { FC, ReactNode } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  FunctionTestCase,
  SelectedFunction,
  SerializableFunctionDeclaration,
  TestOutput,
} from "../../src-shared/source-info";
import {
  blankTestCase,
  findTestCases,
  findTestOutputs,
  updateSourceFileTestCase,
} from "../../src-shared/testcases";
import {
  latestTestOutputState,
  selectedTestCaseIndexState,
  testCasesState,
} from "../shared/state";
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
  const testOutputs = useRecoilValue(latestTestOutputState);
  const testOutputsForSelectedFunction =
    findTestOutputs(
      testOutputs,
      selectedFunction?.fileName,
      selectedFunction?.functionName
    )?.outputs ?? [];

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
  const formattedDeclaration = formatDeclaration(fn);
  const functionTestCase: FunctionTestCase | undefined =
    testCasesForSelectedFunction[testIndex];
  const functionTestOutput: TestOutput | undefined =
    testOutputsForSelectedFunction[testIndex];

  // if (!functionTestCase) {
  //   console.log("missing functionTestCase for ", testIndex);
  // }
  return (
    <>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <b style={{ fontSize: "20px" }}>Function:</b>
        <div
          style={{
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
            borderColor: "var(--checkbox-border)",
            borderWidth: "var(--border-width)",
            borderStyle: "solid",
          }}
        >
          <code style={{ whiteSpace: "nowrap" }}>{formattedDeclaration}</code>
        </div>
      </div>
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
            gap: "1rem",
            alignContent: "start",
            gridTemplateColumns: "1fr 1fr",
            margin: "12px",
            minWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: "bolder",
              position: "sticky",
              top: 0,
              backgroundColor: "var(--background)",
            }}
          >
            Inputs
          </div>
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {functionTestCase &&
              fn.parameters.map((param) => (
                <div
                  key={param.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <ParamEditor
                    parameter={param}
                    value={functionTestCase.inputs[param.name]}
                    onChange={(newValue) =>
                      onUpdateTestCase(param.name, newValue)
                    }
                  />
                </div>
              ))}
          </div>

          <div
            style={{
              margin: "6px",
              overflow: "scroll",
            }}
          >
            {functionTestCase && (
              <code style={{ whiteSpace: "pre" }}>
                {formatOutput(functionTestOutput?.output)}
              </code>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

function formatDeclaration(fn: SerializableFunctionDeclaration) {
  return fn.declaration
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
}

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
