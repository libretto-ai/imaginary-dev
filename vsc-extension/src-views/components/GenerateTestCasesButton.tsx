import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC } from "react";
import { useRecoilState } from "recoil";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { SelectedFunction } from "../../src-shared/source-info";
import { addFunctionTestCase, findTestCases } from "../../src-shared/testcases";
import { testCasesState } from "../shared/state";
import { useExtensionState } from "./ExtensionState";
import { HasAccessToModel } from "../../src/has-access-enum";

export const GenerateTestCasesButton: FC<{
  selectedFunction: SelectedFunction;
}> = ({ selectedFunction }) => {
  const { rpcProvider } = useExtensionState();
  const { fileName, functionName } = selectedFunction;
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const { isMutating: isAccessToModelMutating, trigger: hasAccessToModel } =
    useSWRMutation("gpt-4-suport", async () =>
      rpcProvider?.rpc("hasAccessToModel", {
        modelName: "gpt-4",
      })
    );
  const { isMutating, trigger: generateTestParameters } = useSWRMutation(
    "generateTestParameters",
    async () => {
      const testCasesForSelectedFunction =
        findTestCases(
          testCases,
          selectedFunction?.fileName,
          selectedFunction?.functionName
        )?.testCases ?? [];

      return rpcProvider?.rpc("generateTestParametersForTypeScriptFunction", {
        fileName,
        functionName,
        existingTestInputs: testCasesForSelectedFunction.map(
          ({ inputs }) => inputs
        ),
      });
    }
  );

  const onRun = async () => {
    try {
      const hasGpt4Support = await hasAccessToModel();
      if (typeof hasGpt4Support === "undefined") return;
      if (hasGpt4Support == HasAccessToModel.NO_API_KEY) {
        // if the user declined to give OpenAI API key, then just return
        return;
      }

      if (HasAccessToModel.NO_ACCESS === hasGpt4Support) {
        rpcProvider?.rpc("showErrorMessage", {
          message:
            "In order to generate test cases, you need access to the GPT-4 API, which is currently in beta. To request beta access to GPT-4, please go to https://openai.com/waitlist/gpt-4-api",
        });
        console.log("no gpt-4 support");
        return;
      }

      const newInputs = await generateTestParameters();

      if (!newInputs) {
        return;
      }

      setTestCases((prevTestCases) => {
        const { __testName, ...inputs } = newInputs;
        return addFunctionTestCase(prevTestCases, fileName, functionName, {
          name: __testName ?? "New test",
          hasCustomName: !!__testName,
          inputs,
        });
      });
    } catch (ex) {
      console.error(`Failure to run: ${ex}`, ex);
    }
  };

  const loading = isAccessToModelMutating || isMutating;
  return (
    <>
      <VSCodeButton onClick={onRun} disabled={loading}>
        {loading ? (
          <span className={`codicon codicon-loading codicon-modifier-spin`} />
        ) : (
          "Generate Test Case"
        )}
      </VSCodeButton>
    </>
  );
};
