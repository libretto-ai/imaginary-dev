import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback, useEffect, useState } from "react";
import { MaybeSelectedFunction } from "../../src-shared/source-info";
import { useExtensionState } from "./ExtensionState";

export const RunButton: FC<{
  selectedFunction: MaybeSelectedFunction;
  hasTestOutput: boolean;
  testCaseIndex: number;
  onDelete: () => void;
  onRename: () => void;
}> = ({
  selectedFunction,
  hasTestOutput,
  testCaseIndex,
  onDelete,
  onRename,
}) => {
  const { rpcProvider } = useExtensionState();
  const { fileName, functionName } = selectedFunction ?? {};
  const [loading, setLoading] = useState(false);
  const [runError, setRunError] = useState<Error | null>(null);

  const onRun = useCallback(async () => {
    if (!fileName || !functionName) {
      return;
    }
    try {
      setLoading(true);
      setRunError(null);
      const p1 = rpcProvider?.rpc("runTestCase", {
        fileName,
        functionName,
        testCaseIndex,
      });
      const p2 = rpcProvider?.rpc("guessTestName", {
        fileName,
        functionName,
        testCaseIndex,
      });
      await Promise.all([p1, p2]);
    } catch (ex) {
      console.error(`Failure to run: ${ex}`, ex);
      setRunError(ex as any);
    } finally {
      setLoading(false);
    }
  }, [fileName, functionName, rpcProvider, testCaseIndex]);

  // this is not my favorite way to do this; we should probably push this
  // logic to the backend, but that's a lot of work. so: this autoruns any
  // test case that doesn't have current output.
  useEffect(() => {
    if (!hasTestOutput && !loading && !runError) {
      onRun();
    }
  }, [hasTestOutput, loading, onRun, runError]);

  if (!rpcProvider) {
    return null;
  }

  console.log("error = ", runError);
  const iconClass = getPlayIcon(loading, !!runError);

  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      <VSCodeButton
        onClick={onDelete}
        disabled={!selectedFunction}
        appearance="icon"
      >
        <span className="codicon codicon-trash" />
      </VSCodeButton>
      <VSCodeButton
        onClick={onRename}
        disabled={!selectedFunction}
        appearance="icon"
      >
        <span className="codicon codicon-edit" />
      </VSCodeButton>
      <VSCodeButton
        onClick={onRun}
        disabled={!selectedFunction}
        appearance="icon"
      >
        <span className={`codicon ${iconClass}`} />
      </VSCodeButton>
    </div>
  );
};
function getPlayIcon(loading: boolean, error: boolean) {
  if (loading) {
    return "codicon-loading codicon-modifier-spin";
  }
  if (error) {
    return "codicon-run-errors";
  }

  return "codicon-play";
}
