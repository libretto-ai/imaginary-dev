import React from "react";
import { useExtensionState } from "./ExtensionState";

export const InputPanel = () => {
  const { selectedFunction, testCases } = useExtensionState();

  if (!selectedFunction) {
    return <p>No function selected</p>;
  }
  const functionTestCases = testCases[
    selectedFunction.fileName
  ]?.testCases.find(
    ({ functionName }) => selectedFunction.functionName === functionName
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
        <ul>
          {functionTestCases.testCases.map((testCase, index) => (
            <pre key={index}>{JSON.stringify(testCase.inputs)}</pre>
          ))}
          <li></li>
        </ul>
      )}
      <pre></pre>
    </div>
  );
};
