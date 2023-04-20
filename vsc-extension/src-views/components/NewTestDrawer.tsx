import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import { addFunctionTestCase, blankTestCase } from "../../src-shared/testcases";
import { selectedFunctionState, testCasesState } from "../shared/state";
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
    onCloseDrawer();
  }, [draftTestCase, onCloseDrawer, selectedFunction, setTestCases, testCases]);

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
