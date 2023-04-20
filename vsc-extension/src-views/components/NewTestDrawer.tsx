import React, { FC, useState } from "react";
import {
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import { blankTestCase } from "../../src-shared/testcases";
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
  const [draftTestCase, setDraftTestCase] =
    useState<FunctionTestCase>(blankTestCase);
  const onUpdateDraftTestCase = (paramName: string, value: string): void =>
    setDraftTestCase((prevTestCase) => ({
      ...prevTestCase,
      inputs: { ...prevTestCase.inputs, [paramName]: value },
    }));

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
    >
      <TestCaseInputEditor
        fn={fn}
        functionTestCase={draftTestCase}
        onUpdateTestCase={onUpdateDraftTestCase}
      />
    </Drawer>
  );
};
