import React from "react";
import { useRecoilValue } from "recoil";
import { findMatchingFunction } from "../../src-shared/source-info";
import { selectedFunctionState, sourcesState } from "../shared/state";
import { DebugPanel } from "./DebugPanel";
import { TestCaseDashboard } from "./TestCaseDashboard";
import ;
export function OutputPanel() {
  const sources = useRecoilValue(sourcesState);
  const selectedFunction = useRecoilValue(selectedFunctionState);

  const fn = findMatchingFunction(sources, selectedFunction);

  const haveFn = fn && selectedFunction;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginTop: "1rem",
      }}
    >
      {haveFn && (
        <TestCaseDashboard fn={fn} selectedFunction={selectedFunction} />
      )}
      <DebugPanel />
    </div>
  );
}


