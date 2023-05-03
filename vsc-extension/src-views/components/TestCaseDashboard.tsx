import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, ReactNode } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  FunctionTestCase,
  SelectedFunction,
  SerializableFunctionDeclaration,
  TestOutput,
} from "../../src-shared/source-info";
import {
  blankTestCase,
  findTestCases,
  findTestOutputs,
  updateSourceFileTestCase,
} from "../../src-shared/testcases";
import {
  latestTestOutputState,
  selectedTestCaseIndexState,
  testCasesState,
} from "../shared/state";
import { GenerateTestCasesButton } from "./GenerateTestCasesButton";
import { NewTestDrawer } from "./NewTestDrawer";
import { TestCaseInputEditor } from "./TestCaseInputEditor";
import { TestCasesList } from "./TestCasesList";
import { useToggle } from "./useToggle";

interface Props {
  fn: SerializableFunctionDeclaration;
  selectedFunction: SelectedFunction;
}

export const TestCaseDashboard: FC<Props> = ({ fn, selectedFunction }) => {
  const [testIndex, setTestIndex] = useRecoilState(
    selectedTestCaseIndexState(selectedFunction)
  );
  const {
    onClose: onCloseDrawer,
    onOpen: onOpenDrawer,
    isOpen: isDrawerOpen,
  } = useToggle();

  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const testCasesForSelectedFunction =
    findTestCases(
      testCases,
      selectedFunction?.fileName,
      selectedFunction?.functionName
    )?.testCases ?? [];
  const testOutputs = useRecoilValue(latestTestOutputState);
  const testOutputsForSelectedFunction =
    findTestOutputs(
      testOutputs,
      selectedFunction?.fileName,
      selectedFunction?.functionName
    )?.outputs ?? [];

  const onUpdateTestCase = (paramName: string, value: string) => {
    const { fileName, functionName } = selectedFunction;

    setTestCases((prevFileTestCases) => {
      return updateSourceFileTestCase(
        prevFileTestCases,
        fileName,
        functionName,
        testIndex,
        (prevTestCase) => ({
          ...blankTestCase,
          ...prevTestCase,
          inputs: {
            ...prevTestCase?.inputs,
            [paramName]: value,
          },
        })
      );
    });
  };
  const formattedDeclaration = formatDeclaration(fn);
  const functionTestCase: FunctionTestCase | undefined =
    testCasesForSelectedFunction[testIndex];
  const functionTestOutput: TestOutput | undefined =
    testOutputsForSelectedFunction[testIndex];

  // if (!functionTestCase) {
  //   console.log("missing functionTestCase for ", testIndex);
  // }
  return (
    <div
      style={{
        paddingLeft: "0.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        overflow: "hidden",
      }}
    >
      <NewTestDrawer
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={onCloseDrawer}
        fn={fn}
      />
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          paddingTop: "1rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        <span style={{ fontSize: "16px" }}>Function:</span>
        <div
          style={{
            padding: "0.5rem",
            backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
            borderColor: "var(--checkbox-border)",
            borderWidth: "var(--border-width)",
            borderStyle: "solid",
            overflow: "hidden",
            textOverflow: "ellipsis",
            borderRadius: "var(--button-icon-corner-radius)",
          }}
        >
          <code style={{ whiteSpace: "nowrap" }}>{formattedDeclaration}</code>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gap: "0.5rem",
          gridTemplateColumns: "min-content 1fr 1fr",
          paddingLeft: "0.5rem",
          minWidth: "500px",
          width: "100%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <VSCodeButton style={{ flex: 1 }} onClick={onOpenDrawer}>
            Add new test
          </VSCodeButton>
          <GenerateTestCasesButton
            style={{ flex: 1 }}
            selectedFunction={selectedFunction}
          >
            Generate
          </GenerateTestCasesButton>
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: "bolder",
            alignSelf: "center",
          }}
        >
          Inputs
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: "bolder",
            alignSelf: "center",
          }}
        >
          Output
        </div>
        <TestCasesList
          testCases={testCasesForSelectedFunction}
          testOutputs={testOutputsForSelectedFunction}
          selectedFunction={selectedFunction}
          selectedIndex={testIndex}
          onSelect={setTestIndex}
          style={{ overflow: "auto" }}
        />

        <TestCaseInputEditor
          functionTestCase={functionTestCase}
          fn={fn}
          onUpdateTestCase={onUpdateTestCase}
          style={{ overflow: "auto", paddingRight: "0.5rem" }}
        />

        <div
          style={{
            margin: "6px",
            overflow: "auto",
          }}
        >
          {functionTestCase && (
            <code
              style={{
                whiteSpace: functionTestOutput?.error ? "pre-line" : "pre",
                color: functionTestOutput?.error
                  ? "var(--vscode-errorForeground)"
                  : undefined,
              }}
            >
              {formatOutput(functionTestOutput)}
            </code>
          )}
        </div>
      </div>
    </div>
  );
};

function formatDeclaration(fn: SerializableFunctionDeclaration) {
  return fn.declaration
    .split(new RegExp(`\\b${fn.name}\\b`))
    .flatMap<ReactNode>((segment, index) => {
      if (index === 0) {
        return [
          <span data-index={index} key={index}>
            {segment}
          </span>,
        ];
      }
      return [
        <b data-index={index} key={`${index}-fn`}>
          {fn.name}
        </b>,
        <span data-index={index} key={index}>
          {segment}
        </span>,
      ];
    });
}

export function formatOutput(output?: TestOutput) {
  if (!output) {
    return "-";
  }
  if (output.error) {
    return `${output.error}`;
  }
  const { output: value } = output;
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (value === null || value === undefined) {
    return "-";
  }
  return JSON.stringify(value, null, 2);
}
