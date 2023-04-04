import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextArea,
} from "@vscode/webview-ui-toolkit/react";
import { produce } from "immer";
import React, { useCallback, useState } from "react";
import {
  FunctionTestCase,
  FunctionTestCases,
  SerializableFunctionDeclaration,
  SourceFileTestCaseMap,
} from "../../src-shared/source-info";
import { addFunctionTestCase, findTestCases } from "../../src-shared/testcases";
import { findMatchingFunction } from "../../src/util/serialized-source";
import { useExtensionState } from "./ExtensionState";

const emptyTestCase: FunctionTestCase = {
  inputs: {},
  name: "New test case",
  output: {
    current: null,
    prev: null,
  },
};

function updateFunctionTestCase<T>(
  functionTestCase: FunctionTestCase,
  paramName: string,
  value: T
): FunctionTestCase {
  return produce(functionTestCase, (draft) => {
    draft.inputs[paramName] = value;
  });
}

function updateFunctionTestCases<T>(
  functionTestCases: FunctionTestCases,
  index: number,
  paramName: string,
  value: T
): FunctionTestCases {
  return produce(functionTestCases, (draft) => {
    draft.testCases = produce(draft.testCases, (draftTestCases) => {
      draftTestCases[index] = updateFunctionTestCase(
        draftTestCases[index] ?? emptyTestCase,
        paramName,
        value
      );
    });
  });
}

function updateSourcefileTestCase<T>(
  sourceFileTestCases: SourceFileTestCaseMap,
  sourceFileName: string,
  functionName: string,
  index: number,
  paramName: string,
  value: T
): SourceFileTestCaseMap {
  return produce(sourceFileTestCases, (draft) => {
    draft[sourceFileName] = produce(
      draft[sourceFileName] ?? { sourceFileName, functionTestCases: [] },
      (draftTestCases) => {
        const functionTestCaseIndex =
          draftTestCases.functionTestCases.findIndex(
            (testCase) => testCase.functionName === functionName
          ) ?? { functionName, testCases: [] };
        if (functionTestCaseIndex !== -1) {
          draftTestCases.functionTestCases[functionTestCaseIndex] =
            updateFunctionTestCases(
              draftTestCases.functionTestCases[functionTestCaseIndex],
              index,
              paramName,
              value
            );
        } else {
          draftTestCases.functionTestCases.push(
            updateFunctionTestCases(
              { functionName, testCases: [] },
              index,
              paramName,
              value
            )
          );
        }
      }
    );
  });
}

export const InputPanel = () => {
  const { selectedFunction, testCases, updateTestCases, sources } =
    useExtensionState();
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);

  const onUpdateTestCase = useCallback(
    (
      sourceFileName: string,
      functionName: string,
      paramName: string,
      testCaseIndex: number,
      value: string
    ) => {
      updateTestCases((prevFileTestCases) => {
        return updateSourcefileTestCase(
          prevFileTestCases,
          sourceFileName,
          functionName,
          testCaseIndex,
          paramName,
          value
        );
      });
    },
    [updateTestCases]
  );
  const onAddTestCase = useCallback(() => {
    if (!selectedFunction) {
      return;
    }
    const { fileName, functionName } = selectedFunction;
    const newTestCase: FunctionTestCase = {
      name: "New test",
      inputs: {},
      output: {
        prev: {},
        current: {},
      },
    };
    updateTestCases(
      addFunctionTestCase(testCases, fileName, functionName, newTestCase)
    );
  }, [selectedFunction, updateTestCases, testCases]);
  if (!selectedFunction) {
    return <p>No function selected</p>;
  }
  const { fileName, functionName } = selectedFunction;
  const functionTestCases = findTestCases(testCases, fileName, functionName);
  const selectedFunctionInfo = findMatchingFunction(sources, selectedFunction);
  const selectedTestCase = functionTestCases?.testCases[selectedTestCaseIndex];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p>
        Test cases for <code>{selectedFunction.functionName}</code>
      </p>
      {!functionTestCases && (
        <p>
          <i>No test cases yet</i>
        </p>
      )}
      <div style={{ display: "flex" }}>
        {!!functionTestCases && (
          <VSCodeDropdown
            onChange={(e) => {
              const indexStr = (e.target as HTMLOptionElement).value;
              const index = parseInt(indexStr);
              setSelectedTestCaseIndex(index);
            }}
            value={`${selectedTestCaseIndex}`}
          >
            {functionTestCases.testCases.map((testCase, index) => (
              <VSCodeOption key={index} value={`${index}`}>
                {formatTestCase(selectedFunctionInfo, testCase)}
              </VSCodeOption>
            ))}
          </VSCodeDropdown>
        )}
        <VSCodeButton onClick={onAddTestCase}>Add test case</VSCodeButton>
      </div>
      {!!selectedTestCase && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {selectedFunctionInfo?.parameters.map((param) => (
            <div key={param.name} style={{ display: "flex" }}>
              <VSCodeTextArea
                style={{ flex: 1 }}
                value={selectedTestCase.inputs[param.name] ?? ""}
                onChange={(e: any) => {
                  onUpdateTestCase(
                    fileName,
                    functionName,
                    param.name,
                    selectedTestCaseIndex,
                    e.target.value
                  );
                }}
              >
                <code>{param.name}</code>
              </VSCodeTextArea>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function formatTestCase(
  fnDecl: SerializableFunctionDeclaration | undefined,
  testCase: FunctionTestCase
) {
  if (!fnDecl) {
    return "<no declaration>";
  }
  if (fnDecl.parameters.length === 1) {
    return testCase.inputs[fnDecl.parameters[0].name];
  }
  if (fnDecl.parameters.length === 0) {
    return "<no parameters>";
  }
  const name = fnDecl.parameters
    .filter((param) => param.name in testCase.inputs[param.name])
    .map((param) => `${param.name}:${testCase.inputs[param.name]}`)
    .join(",");
  if (!name) {
    return "<new>";
  }
  return name;
}
