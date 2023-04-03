import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import React, { useCallback } from "react";
import {
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import { addFunctionTestCase, findTestCases } from "../../src-shared/testcases";
import { findMatchingFunction } from "../../src/util/serialized-source";
import { useExtensionState } from "./ExtensionState";

export const InputPanel = () => {
  const { selectedFunction, testCases, updateTestCases, sources } =
    useExtensionState();

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
    updateTestCases(
      addFunctionTestCase(testCases, fileName, functionName, newTestCase)
    );
  }, [selectedFunction, updateTestCases, testCases]);
  if (!selectedFunction) {
    return <p>No function selected</p>;
  }
  const { fileName, functionName } = selectedFunction;
  const functionTestCases = findTestCases(testCases, fileName, functionName);
  const selectedFunctionInfo = findMatchingFunction(sources, selectedFunction);

  return (
    <div>
      <p>Test cases for {selectedFunction.functionName}</p>
      {!functionTestCases && (
        <p>
          <i>No test cases yet</i>
        </p>
      )}
      {!!functionTestCases && (
        <VSCodeDropdown>
          {functionTestCases.testCases.map((testCase, index) => (
            <VSCodeOption key={index}>
              {formatTestCase(selectedFunctionInfo, testCase)}
            </VSCodeOption>
          ))}
        </VSCodeDropdown>
      )}
      <VSCodeButton onClick={onAddTestCase}>Add test case</VSCodeButton>
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
  return fnDecl.parameters
    .map((param) => `${param.name}:${testCase.inputs[param.name]}`)
    .join(",");
}
