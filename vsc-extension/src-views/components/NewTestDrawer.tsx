import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback, useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import {
  addFunctionTestCase,
  addBlankOutputToStart,
  blankTestCase,
} from "../../src-shared/testcases";
import {
  latestTestOutputState,
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
  const setTestCases = useSetRecoilState(testCasesState);
  const setLatestTestOutput = useSetRecoilState(latestTestOutputState);
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
    setTestCases((prevTestCases) =>
      addFunctionTestCase(
        prevTestCases,
        selectedFunction.fileName,
        selectedFunction.functionName,
        draftTestCase
      )
    );
    setLatestTestOutput((prevTestOutput) =>
      addBlankOutputToStart(
        prevTestOutput,
        selectedFunction.fileName,
        selectedFunction.functionName
      )
    );

    // new test is added at the top
    setTestCaseIndex(0);

    onCloseDrawer();

    // clear out state for the next one
    setDraftTestCase(blankTestCase);
  }, [
    draftTestCase,
    onCloseDrawer,
    selectedFunction,
    setTestCaseIndex,
    setTestCases,
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
        autoFocusFirst={isDrawerOpen}
        functionTestCase={draftTestCase}
        onUpdateTestCase={onUpdateDraftTestCase}
      />
    </Drawer>
  );
};
