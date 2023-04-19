import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback, useEffect, useState } from "react";
import { MaybeSelectedFunction } from "../../src-shared/source-info";
import { useExtensionState } from "./ExtensionState";

export const RunButton: FC<{
  selectedFunction: MaybeSelectedFunction;
  hasTestOutput: boolean;
  testCaseIndex: number;
  onDelete: () => void;
}> = ({ selectedFunction, hasTestOutput, testCaseIndex, onDelete }) => {
  const { rpcProvider } = useExtensionState();
  const { fileName, functionName } = selectedFunction ?? {};
  const [loading, setLoading] = useState(false);

  // this is not my favorite way to do this; we should probably push this
  // logic to the backend, but that's a lot of work. so: this autoruns any
  // test case that doesn't have current output.
  useEffect(() => {
    if (!hasTestOutput) {
      onRun();
    }
  });

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
    <>
      <VSCodeButton
        onClick={onDelete}
        disabled={!selectedFunction}
        appearance="icon"
      >
        <span className="codicon codicon-trash mr-5" />
      </VSCodeButton>
      <VSCodeButton
        onClick={onRun}
        disabled={!selectedFunction}
        appearance="icon"
      >
        <span className={`codicon ${iconClass}`} />
      </VSCodeButton>
    </>
  );
};
