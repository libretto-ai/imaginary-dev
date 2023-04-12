import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  debugState,
  selectedFunctionState,
  selectedTestCaseState,
  sourcesState,
  testCasesState,
} from "../shared/state";

export const DebugPanel: FC = () => {
  const [debug, setDebug] = useRecoilState(debugState);
  const sources = useRecoilValue(sourcesState);
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const testCases = useRecoilValue(testCasesState);
  const selectedTestCaseIndexes = useRecoilValue(selectedTestCaseState);
  return (
    <div>
      <VSCodeButton
        appearance="icon"
        onClick={() => setDebug((prevDebug) => !prevDebug)}
      >
        <span className="codicon codicon-debug" />
      </VSCodeButton>
      {debug && (
        <div>
          <p>Functions</p>
          <pre>{JSON.stringify(sources, null, 4)}</pre>
          <p>SelectedFunction</p>
          <pre>{JSON.stringify(selectedFunction, null, 4)}</pre>
          <p>Inputs/Outputs</p>
          <pre>{JSON.stringify(testCases, null, 4)}</pre>
          <p>TestCaseIndexes</p>
          <pre>{JSON.stringify(selectedTestCaseIndexes, null, 4)}</pre>
        </div>
      )}
    </div>
  );
};
