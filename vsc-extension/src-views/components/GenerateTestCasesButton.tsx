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
      if (loading) return;
      setLoading(true);

      const hasGpt4Support = await rpcProvider?.rpc("hasAccessToModel", {
        modelName: "gpt-4",
      });

      if (!hasGpt4Support) {
        rpcProvider?.rpc("showErrorMessage", {
          message:
            "In order to generate test cases, you need access to the GPT-4 API, which is currently in beta. To request beta access to GPT-4, please go to https://openai.com/waitlist/gpt-4-api",
        });
        console.log("no gpt-4 support");
        setLoading(false);
        return;
      }

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
      )) as { __testName: string } & Record<string, any>;

      setLoading(false);

      let resultTestCases = testCases;

      // this is a little odd, in that we bundle this test case in an array
      // and then iterate over it. I originally built this as having the function
      // return an array of test cases, and then we changed it to one at a time. We
      // might change it back, so I'm leaving it this way for now.
      [newTestCases].forEach((newTestCase) => {
        resultTestCases = addFunctionTestCase(
          resultTestCases,
          fileName,
          functionName,
          {
            name: newTestCase.__testName ?? "New test",
            hasCustomName: !!newTestCase.__testName,
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
          "Generate Test Case"
        )}
      </VSCodeButton>
    </>
  );
};
