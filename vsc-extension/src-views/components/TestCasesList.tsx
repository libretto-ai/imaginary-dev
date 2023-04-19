import React, { FC } from "react";
import { useRecoilState } from "recoil";
import {
  FunctionTestCase,
  MaybeSelectedFunction,
} from "../../src-shared/source-info";
import {
  deleteFunctionTestCase,
  findTestCases,
} from "../../src-shared/testcases";
import { testCasesState } from "../shared/state";
import { GenerateTestCasesButton } from "./GenerateTestCasesButton";
import { RunButton } from "./RunButton";

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
  const { fileName, functionName } = selectedFunction ?? {};
  const [allTestCases, setAllTestCases] = useRecoilState(testCasesState);

  if (!selectedFunction) {
    return <div />;
  }

  const onDelete = async (index: number) => {
    if (!fileName) {
      return;
    }
    if (!functionName) {
      return;
    }

    const newAllTestCases = deleteFunctionTestCase(
      allTestCases,
      fileName,
      functionName,
      index
    );
    const remainingTestCasesCount =
      findTestCases(newAllTestCases, fileName, functionName)?.testCases
        .length ?? 0;
    if (
      remainingTestCasesCount > 0 &&
      remainingTestCasesCount >= (selectedIndex ?? -1)
    ) {
      onSelect(remainingTestCasesCount - 1);
    }
    setAllTestCases(newAllTestCases);
  };

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
          {/* special flex + padding to ensure whitespace is clickable, even if test name is blank */}
          <span
            style={{ flex: 1, paddingRight: "1rem" }}
            onClick={() => onSelect(index)}
          >
            {testCase.name}
          </span>
          <RunButton
            selectedFunction={selectedFunction}
            testCaseIndex={index}
            onDelete={() => onDelete(index)}
          />
        </div>
      ))}
      <GenerateTestCasesButton selectedFunction={selectedFunction} />
    </div>
  );
};
