import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextArea,
} from "@vscode/webview-ui-toolkit/react";
import React, { useCallback, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import {
  addFunctionTestCase,
  findTestCases,
  updateSourcefileTestCase,
} from "../../src-shared/testcases";
import { findMatchingFunction } from "../../src/util/serialized-source";
import {
  selectedFunctionState,
  sourcesState,
  testCasesState,
} from "../shared/state";

export const InputPanel = () => {
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const sources = useRecoilValue(sourcesState);
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);

  const onUpdateTestCase = useCallback(
    (
      sourceFileName: string,
      functionName: string,
      paramName: string,
      testCaseIndex: number,
      value: string
    ) => {
      setTestCases((prevFileTestCases) => {
        return updateSourcefileTestCase(
          prevFileTestCases,
          sourceFileName,
          functionName,
          testCaseIndex,
          paramName,
          value
        );
      });
    },
    [setTestCases]
  );

  const onAddTestCase = useCallback(() => {
    if (!selectedFunction) {
      return;
    }
    const { fileName, functionName } = selectedFunction;
    const newTestCase: FunctionTestCase = {
      name: "New test",
      inputs: {},
      output: {
        prev: {},
        current: {},
      },
    };
    setTestCases(
      addFunctionTestCase(testCases, fileName, functionName, newTestCase)
    );
  }, [selectedFunction, setTestCases, testCases]);
  if (!selectedFunction) {
    return <p>No function selected</p>;
  }
  const { fileName, functionName } = selectedFunction;

  const functionTestCases = findTestCases(testCases, fileName, functionName);
  const selectedFunctionInfo = findMatchingFunction(sources, selectedFunction);
  const selectedTestCase = functionTestCases?.testCases[selectedTestCaseIndex];
  if (!selectedFunctionInfo) {
    console.log("could not find ", selectedFunction, " in ", sources);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p>
        Test cases for <code>{selectedFunction.functionName}</code>
      </p>
      {!functionTestCases && (
        <p>
          <i>No test cases yet</i>
        </p>
      )}
      <div style={{ display: "flex" }}>
        {!!functionTestCases && (
          <VSCodeDropdown
            onChange={(e) => {
              const indexStr = (e.target as HTMLOptionElement).value;
              const index = parseInt(indexStr);
              setSelectedTestCaseIndex(index);
            }}
            value={`${selectedTestCaseIndex}`}
          >
            {functionTestCases.testCases.map((testCase, index) => (
              <VSCodeOption key={index} value={`${index}`}>
                {formatTestCase(selectedFunctionInfo, testCase)}
              </VSCodeOption>
            ))}
          </VSCodeDropdown>
        )}
        <VSCodeButton onClick={onAddTestCase}>Add test case</VSCodeButton>
      </div>
      {!!selectedTestCase && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {selectedFunctionInfo?.parameters.map((param) => (
            <div key={param.name} style={{ display: "flex" }}>
              <VSCodeTextArea
                style={{ flex: 1 }}
                value={selectedTestCase.inputs[param.name] ?? ""}
                onChange={(e: any) => {
                  onUpdateTestCase(
                    fileName,
                    functionName,
                    param.name,
                    selectedTestCaseIndex,
                    e.target.value
                  );
                }}
              >
                <code>{param.name}</code>
              </VSCodeTextArea>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function formatTestCase(
  fnDecl: SerializableFunctionDeclaration | undefined,
  testCase: FunctionTestCase
) {
  if (!fnDecl) {
    return "<no declaration>";
  }
  if (fnDecl.parameters.length === 1) {
    return testCase.inputs[fnDecl.parameters[0].name];
  }
  if (fnDecl.parameters.length === 0) {
    return "<no parameters>";
  }
  const name = fnDecl.parameters
    .filter((param) => param.name in testCase.inputs)
    .map((param) => `${param.name}:${testCase.inputs[param.name]}`)
    .join(",");
  if (!name) {
    return "<new>";
  }
  return name;
}
