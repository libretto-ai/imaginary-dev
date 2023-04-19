import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useState } from "react";
import { useRecoilState } from "recoil";
import { SelectedFunction } from "../../src-shared/source-info";
import { addFunctionTestCase, findTestCases } from "../../src-shared/testcases";
import { testCasesState } from "../shared/state";
import { useExtensionState } from "./ExtensionState";

export const GenerateTestCasesButton: FC<{
  selectedFunction: SelectedFunction;
}> = ({ selectedFunction }) => {
  const { rpcProvider } = useExtensionState();
  const { fileName, functionName } = selectedFunction;
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const [loading, setLoading] = useState(false);

  const onRun = async () => {
    try {
      setLoading(true);

      const testCasesForSelectedFunction =
        findTestCases(
          testCases,
          selectedFunction?.fileName,
          selectedFunction?.functionName
        )?.testCases ?? [];

      const newTestCases = (await rpcProvider?.rpc(
        "generateTestParametersForTypeScriptFunction",
        {
          fileName,
          functionName,
          existingTestInputs: testCasesForSelectedFunction.map(
            ({ inputs }) => inputs
          ),
        }
      )) as Array<{ __testName: string } & Record<string, any>>;

      setLoading(false);

      let resultTestCases = testCases;

      newTestCases.forEach((newTestCase) => {
        resultTestCases = addFunctionTestCase(
          resultTestCases,
          fileName,
          functionName,
          {
            name: newTestCase.__testName,
            hasCustomName: true,
            inputs: Object.assign({}, newTestCase, { __testName: undefined }),
          }
        );
      });

      setTestCases(resultTestCases);
    } catch (ex) {
      console.error(`Failure to run: ${ex}`, ex);
    }
  };

  return (
    <>
      <VSCodeButton onClick={onRun}>
        {loading ? (
          <span className={`codicon codicon-loading codicon-modifier-spin`} />
        ) : (
          "Generate Test Cases"
        )}
      </VSCodeButton>
    </>
  );
};
