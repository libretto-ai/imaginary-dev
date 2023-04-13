import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback, useState } from "react";
import { MaybeSelectedFunction } from "../../src-shared/source-info";
import { useExtensionState } from "./ExtensionState";

export const RunButton: FC<{
  selectedFunction: MaybeSelectedFunction;
  testCaseIndex: number;
}> = ({ selectedFunction, testCaseIndex }) => {
  const { rpcProvider } = useExtensionState();
  const { fileName, functionName } = selectedFunction ?? {};
  const [loading, setLoading] = useState(false);

  const onRun = useCallback(async () => {
    try {
      setLoading(true);
      await rpcProvider?.rpc("runTestCase", {
        fileName,
        functionName,
        testCaseIndex,
      });
      await rpcProvider?.rpc("guessTestName", {
        fileName,
        functionName,
        testCaseIndex,
      });
    } catch (ex) {
      console.error(`Failure to run: ${ex}`, ex);
    } finally {
      setLoading(false);
    }
  }, [fileName, functionName, rpcProvider, testCaseIndex]);

  if (!rpcProvider) {
    return null;
  }

  const iconClass = loading
    ? "codicon-loading codicon-modifier-spin"
    : "codicon-play";

  return (
    <VSCodeButton
      onClick={onRun}
      disabled={!selectedFunction}
      appearance="icon"
    >
      <span className={`codicon ${iconClass}`} />
    </VSCodeButton>
  );
};
