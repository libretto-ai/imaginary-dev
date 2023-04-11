import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback } from "react";
import { SelectedFunction } from "../../src-shared/source-info";
import { useExtensionState } from "./ExtensionState";

export const RunButton: FC<{
  selectedFunction: SelectedFunction;
  testCaseIndex: number;
}> = ({ selectedFunction, testCaseIndex }) => {
  const { rpcProvider } = useExtensionState();
  const { fileName, functionName } = selectedFunction;

  const onRun = useCallback(async () => {
    try {
      await rpcProvider?.rpc("runTestCase", {
        fileName,
        functionName,
        testCaseIndex,
      });
    } catch (ex) {
      console.error(`Failure to run: ${ex}`, ex);
    }
  }, [fileName, functionName, rpcProvider, testCaseIndex]);

  if (!rpcProvider) {
    return null;
  }
  return <VSCodeButton onClick={onRun}>Run</VSCodeButton>;
};
