import { useRecoilState } from "recoil";
import { SelectedFunction } from "../../src-shared/source-info";
import { useExtensionState } from "./ExtensionState";
import { testCasesState } from "../shared/state";
import React, { FC, useState } from "react";
import { addFunctionTestCase } from "../../src-shared/testcases";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

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

      const newTestCases = (await rpcProvider?.rpc(
        "generateTestParametersForTypeScriptFunction",
        {
          fileName,
          functionName,
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
            inputs: Object.assign({}, newTestCase, { __testName: undefined }),
            output: {
              prev: null,
              current: null,
            },
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
