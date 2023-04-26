import React from "react";
import { useRecoilValue } from "recoil";
import logo from "../../resources/favicon-32x32.png";
import { findMatchingFunction } from "../../src-shared/source-info";
import { selectedFunctionState, sourcesState } from "../shared/state";
import { TestCaseDashboard } from "./TestCaseDashboard";
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
        height: "100vh",
        width: "100vw",
      }}
    >
      {haveFn && (
        <TestCaseDashboard fn={fn} selectedFunction={selectedFunction} />
      )}
      {!haveFn && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            minHeight: "100vh",
          }}
        >
          <img src={logo} />
          <p>Please move your cursor into an imaginary function.</p>
        </div>
      )}
    </div>
  );
}
