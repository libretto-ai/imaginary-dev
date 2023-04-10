import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import React, { useCallback } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  findMatchingFunction,
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import {
  addFunctionTestCase,
  findTestCases,
  updateSourcefileTestCase,
} from "../../src-shared/testcases";
import {
  selectedFunctionState,
  selectedTestCaseIndexState,
  sourcesState,
  testCasesState,
} from "../shared/state";
import { TestCaseEditor } from "./TestCaseEditor";

export const InputPanel = () => {
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const sources = useRecoilValue(sourcesState);
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useRecoilState(
    selectedTestCaseIndexState(selectedFunction)
  );

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
      <div>
        Test cases for <code>{selectedFunction.functionName}</code>
      </div>
      {!functionTestCases && (
        <div>
          <i>No test cases yet</i>
        </div>
      )}
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
      {!!selectedTestCase &&
        TestCaseEditor({
          selectedFunctionInfo,
          selectedTestCase,
          onUpdateTestCase,
          selectedFunction,
          selectedTestCaseIndex,
        })}
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
