import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { useCallback } from "react";
import { FunctionTestCase } from "../../src-shared/source-info";
import { addFunctionTestCase, findTestCases } from "../../src-shared/testcases";
import { useExtensionState } from "./ExtensionState";

export const InputPanel = () => {
  const { selectedFunction, testCases, updateTestCases } = useExtensionState();

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

  console.log(
    "have functionTestCases: ",
    functionTestCases,
    " from ",
    testCases
  );
  return (
    <div>
      <p>Test cases for {selectedFunction.functionName}</p>
      {!functionTestCases && (
        <p>
          <i>No test cases yet</i>
        </p>
      )}
      {!!functionTestCases && (
        <ol>
          {functionTestCases.testCases.map((testCase, index) => (
            <li key={index}>
              <pre>{JSON.stringify(testCase.inputs)}</pre>
            </li>
          ))}
        </ol>
      )}
      <VSCodeButton onClick={onAddTestCase}>Add test case</VSCodeButton>
    </div>
  );
};
