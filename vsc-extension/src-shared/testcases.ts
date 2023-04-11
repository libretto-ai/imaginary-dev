import {
  FunctionTestCase,
  FunctionTestCases,
  SourceFileTestCaseMap,
} from "./source-info";

export function addFunctionTestCase(
  testCases: SourceFileTestCaseMap,
  sourceFileName: string,
  functionName: string,
  newTestCase: FunctionTestCase
): SourceFileTestCaseMap {
  const fileTestCases = testCases[sourceFileName] ?? {
    sourceFileName,
    functionTestCases: [],
  };

  return {
    ...testCases,
    [sourceFileName]: {
      ...fileTestCases,
      functionTestCases: addTestCaseToFile(
        fileTestCases.functionTestCases,
        functionName,
        newTestCase
      ),
    },
  };
}
function addTestCaseToFile(
  functionTestCases: FunctionTestCases[],
  targetFunctionName: string,
  newTestCase: FunctionTestCase
): FunctionTestCases[] {
  const matchingFunctionTestCases = functionTestCases.find(
    ({ functionName }) => functionName === targetFunctionName
  );
  if (!matchingFunctionTestCases) {
    return [
      ...functionTestCases,
      { functionName: targetFunctionName, testCases: [newTestCase] },
    ];
  }
  return functionTestCases.map((prevFunctionTestCase: FunctionTestCases) =>
    addTestCaseToFunction(prevFunctionTestCase, targetFunctionName, newTestCase)
  );
}
function addTestCaseToFunction(
  prevFunctionTestCase: FunctionTestCases,
  functionName: string,
  newTestCase: FunctionTestCase
) {
  if (prevFunctionTestCase.functionName === functionName) {
    return {
      ...prevFunctionTestCase,
      testCases: [...prevFunctionTestCase.testCases, newTestCase],
    };
  }
  return prevFunctionTestCase;
}

export function findTestCases(
  testCases: SourceFileTestCaseMap,
  fileName?: string,
  functionNameTarget?: string
): FunctionTestCases | undefined {
  if (!fileName || !functionNameTarget) {
    return;
  }
  return testCases[fileName]?.functionTestCases.find(
    ({ functionName }) => functionName === functionNameTarget
  );
}

import { produce } from "immer";

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
export function updateSourcefileTestCase<T>(
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
