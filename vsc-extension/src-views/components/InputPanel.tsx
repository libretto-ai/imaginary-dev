import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import React, { useCallback, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  findMatchingFunction,
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import {
  addFunctionTestCase,
  blankTestCase,
  findTestCases,
} from "../../src-shared/testcases";
import {
  selectedFunctionState,
  selectedTestCaseIndexState,
  sourcesState,
  testCasesState,
} from "../shared/state";
import { TestCaseEditor } from "./TestCaseEditor";

// wrapper designed to reset the InputPanel state when the selected function changes. see
// https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
// to understand why this is necessary.
export const InputPanel = () => {
  const selectedFunction = useRecoilValue(selectedFunctionState);

  const key = selectedFunction
    ? selectedFunction.fileName + "/" + selectedFunction.functionName
    : "";

  return <InputPanelForFunction key={key} />;
};

export const InputPanelForFunction = () => {
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const sources = useRecoilValue(sourcesState);
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useRecoilState(
    selectedTestCaseIndexState(selectedFunction)
  );

  const [newTestCase, setNewTestCase] =
    useState<FunctionTestCase>(blankTestCase);

  const onUpdateTestCase = (paramName: string, value: string) => {
    setNewTestCase((prevTestCase) => {
      return {
        ...prevTestCase,
        inputs: {
          ...prevTestCase.inputs,
          [paramName]: value,
        },
      };
    });
  };

  const onAddTestCase = useCallback(() => {
    if (!selectedFunction) {
      return;
    }
    const { fileName, functionName } = selectedFunction;

    // add attributes with null values for ones that weren't added
    const selectedFunctionInfo = findMatchingFunction(
      sources,
      selectedFunction
    );

    const inputsWithFilledInUndefinedValues = Object.assign(
      {},
      Object.fromEntries(
        selectedFunctionInfo?.parameters.map(({ name }) => [name, null]) || []
      ),
      newTestCase.inputs
    );

    const newTestCaseWithFilledInUndefineds = Object.assign({}, newTestCase, {
      inputs: inputsWithFilledInUndefinedValues,
    });
    // add the form's test case into the object model.
    const newTestCases = addFunctionTestCase(
      testCases,
      fileName,
      functionName,
      newTestCaseWithFilledInUndefineds
    );
    setTestCases(newTestCases);

    // reset the form.
    setNewTestCase(blankTestCase);

    // select the most recently added input.
    const currentLength = newTestCases[fileName]?.functionTestCases.find(
      ({ functionName: arg }) => arg === functionName
    )?.testCases.length;
    setSelectedTestCaseIndex(
      typeof currentLength === "undefined" ? 0 : currentLength - 1
    );
  }, [
    selectedFunction,
    sources,
    testCases,
    newTestCase,
    setTestCases,
    setSelectedTestCaseIndex,
  ]);

  if (!selectedFunction) {
    return <p>No function selected</p>;
  }
  const { fileName, functionName } = selectedFunction;

  const functionTestCases = findTestCases(testCases, fileName, functionName);
  const selectedFunctionInfo = findMatchingFunction(sources, selectedFunction);
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
      <TestCaseEditor
        selectedFunctionInfo={selectedFunctionInfo}
        selectedTestCase={newTestCase}
        onUpdateTestCase={onUpdateTestCase}
        selectedFunction={selectedFunction}
        selectedTestCaseIndex={selectedTestCaseIndex}
      />
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
  const name = fnDecl.parameters
    .filter((param) => param.name in testCase.inputs)
    .map((param) => `${param.name}:${testCase.inputs[param.name]}`)
    .join(",");
  if (!name) {
    return "<new>";
  }
  return name;
}
