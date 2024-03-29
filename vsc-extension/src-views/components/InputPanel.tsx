import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { useCallback, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
  findMatchingFunction,
  FunctionTestCase,
} from "../../src-shared/source-info";
import { addFunctionTestCase, blankTestCase } from "../../src-shared/testcases";
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
  const setTestCases = useSetRecoilState(testCasesState);
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

    const newTestCaseWithFilledInUndefineds = {
      ...newTestCase,
      inputs: inputsWithFilledInUndefinedValues,
    };
    // add the form's test case into the object model.
    setTestCases((prevTestCases) => {
      return addFunctionTestCase(
        prevTestCases,
        fileName,
        functionName,
        newTestCaseWithFilledInUndefineds
      );
    });

    // reset the form.
    setNewTestCase(blankTestCase);

    // New test will appear at the front of the list
    setSelectedTestCaseIndex(0);
  }, [
    selectedFunction,
    sources,
    newTestCase,
    setTestCases,
    setSelectedTestCaseIndex,
  ]);

  if (!selectedFunction) {
    return <p>No function selected</p>;
  }

  const selectedFunctionInfo = findMatchingFunction(sources, selectedFunction);
  if (!selectedFunctionInfo) {
    console.log("could not find ", selectedFunction, " in ", sources);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        Test cases for <code>{selectedFunction.functionName}</code>
      </div>

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
