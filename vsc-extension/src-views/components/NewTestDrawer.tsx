import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
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
  testCasesState,
} from "../shared/state";
import { Drawer } from "./Drawer";
import { TestCaseInputEditor } from "./TestCaseInputEditor";

interface Props {
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  fn: SerializableFunctionDeclaration;
}

export const NewTestDrawer: FC<Props> = ({
  isDrawerOpen,
  onCloseDrawer,
  fn,
}) => {
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const setTestCaseIndex = useSetRecoilState(
    selectedTestCaseIndexState(selectedFunction)
  );
  const [draftTestCase, setDraftTestCase] =
    useState<FunctionTestCase>(blankTestCase);
  const onUpdateDraftTestCase = (paramName: string, value: string): void =>
    setDraftTestCase((prevTestCase) => ({
      ...prevTestCase,
      inputs: { ...prevTestCase.inputs, [paramName]: value },
    }));

  const onCreate = useCallback(() => {
    if (!selectedFunction) {
      console.warn("Trying to add function but lost selection");
      return;
    }
    const newTestCases = addFunctionTestCase(
      testCases,
      selectedFunction.fileName,
      selectedFunction.functionName,
      draftTestCase
    );
    setTestCases(newTestCases);

    // Find the index of the new test (at the end) and select it
    const totalTestCases =
      findTestCases(
        newTestCases,
        selectedFunction.fileName,
        selectedFunction.functionName
      )?.testCases.length ?? 0;
    setTestCaseIndex(totalTestCases - 1);

    onCloseDrawer();

    // clear out state for the next one
    setDraftTestCase(blankTestCase);
  }, [
    draftTestCase,
    onCloseDrawer,
    selectedFunction,
    setTestCaseIndex,
    setTestCases,
    testCases,
  ]);

  // Close the drawer whenever the selected function changes
  useEffect(() => {
    onCloseDrawer();
  }, [
    onCloseDrawer,
    selectedFunction?.fileName,
    selectedFunction?.functionName,
  ]);

  return (
    <Drawer
      isOpen={isDrawerOpen}
      onClose={onCloseDrawer}
      header={
        <div>
          <span style={{ fontWeight: "bold" }}>Add test case for</span>{" "}
          <code>{fn.name}</code>
        </div>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <VSCodeButton onClick={onCreate}>Create test case</VSCodeButton>
        </div>
      }
    >
      <TestCaseInputEditor
        fn={fn}
        functionTestCase={draftTestCase}
        onUpdateTestCase={onUpdateDraftTestCase}
      />
    </Drawer>
  );
};
