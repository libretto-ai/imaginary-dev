import React, { FC } from "react";
import {
  FunctionTestCase,
  MaybeSelectedFunction,
} from "../../src-shared/source-info";
import { RunButton } from "./RunButton";
import { GenerateTestCasesButton } from "./GenerateTestCasesButton";

interface Props {
  testCases: FunctionTestCase[];
  selectedFunction: MaybeSelectedFunction;
  selectedIndex: number | null;
  onSelect: (selectedIndex: number) => void;
}

// TestCasesList component
export const TestCasesList: FC<Props> = ({
  testCases,
  selectedIndex,
  selectedFunction,
  onSelect,
}) => {
  if (!selectedFunction) {
    return <div />;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: "120px",
        gap: 10,
      }}
    >
      {testCases.map((testCase, index) => (
        <div
          key={index}
          style={{
            fontWeight: "bold",
            fontSize: "15px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            backgroundColor:
              index === selectedIndex
                ? "var(--list-active-selection-background)"
                : "",
            border:
              index === selectedIndex
                ? "solid calc(var(--border-width) * 1px) var(--focus-border)"
                : "1px solid gray",
            padding: "5px",
            borderRadius: "5px",
          }}
        >
          <span onClick={() => onSelect(index)}>{testCase.name}</span>
          <RunButton
            selectedFunction={selectedFunction}
            testCaseIndex={index}
          />
        </div>
      ))}
      <GenerateTestCasesButton selectedFunction={selectedFunction} />
    </div>
  );
};
