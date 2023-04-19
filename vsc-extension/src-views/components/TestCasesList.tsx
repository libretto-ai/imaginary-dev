import React, { FC } from "react";
import { useRecoilValue } from "recoil";
import {
  FunctionTestCase,
  MaybeSelectedFunction,
  TestOutput,
} from "../../src-shared/source-info";
import { findTestCase } from "../../src-shared/testcases";
import { testCasesState } from "../shared/state";
import { useExtensionState } from "./ExtensionState";
import { GenerateTestCasesButton } from "./GenerateTestCasesButton";
import { RunButton } from "./RunButton";

interface Props {
  testCases: FunctionTestCase[];
  testOutputs: TestOutput[];
  selectedFunction: MaybeSelectedFunction;
  selectedIndex: number | null;
  onSelect: (selectedIndex: number) => void;
}

// TestCasesList component
export const TestCasesList: FC<Props> = ({
  testCases,
  testOutputs,
  selectedIndex,
  selectedFunction,
  onSelect,
}) => {
  const { fileName, functionName } = selectedFunction ?? {};
  const allTestCases = useRecoilValue(testCasesState);
  const { rpcProvider } = useExtensionState();

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
    await rpcProvider?.rpc("deleteTest", {
      fileName,
      functionName,
      testCaseIndex: index,
    });
  };

  const onRename = async (testCaseIndex: number) => {
    if (!fileName) {
      return;
    }
    if (!functionName) {
      return;
    }
    const currentTestName = findTestCase(
      allTestCases,
      fileName,
      functionName,
      testCaseIndex
    )?.name;
    await rpcProvider?.rpc("renameTest", {
      fileName,
      functionName,
      testCaseIndex,
      newTestName: currentTestName,
    });
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
            style={{
              flex: 1,
              paddingRight: "1rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            onClick={() => onSelect(index)}
          >
            {testCase.name}
          </span>
          <RunButton
            selectedFunction={selectedFunction}
            hasTestOutput={!!testOutputs[index]}
            testCaseIndex={index}
            onDelete={() => onDelete(index)}
            onRename={() => onRename(index)}
          />
        </div>
      ))}
      <GenerateTestCasesButton selectedFunction={selectedFunction} />
    </div>
  );
};
