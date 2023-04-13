import { produce } from "immer";
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

export function findTestCase(
  testCases: SourceFileTestCaseMap,
  fileName: string,
  functionName: string,
  testCaseIndex: number
) {
  const functionTestCases = findTestCases(testCases, fileName, functionName);
  if (
    !functionTestCases ||
    testCaseIndex >= functionTestCases.testCases.length
  ) {
    return null;
  }
  const testCase = functionTestCases.testCases[testCaseIndex];
  return testCase;
}

function updateFunctionTestCase(
  functionTestCases: FunctionTestCases,
  index: number,
  updater: (testCase?: FunctionTestCase) => FunctionTestCase
): FunctionTestCases {
  return produce(functionTestCases, (draft) => {
    draft.testCases = produce(draft.testCases, (draftTestCases) => {
      draftTestCases[index] = updater(draftTestCases[index]);
    });
  });
}

export function updateSourceFileTestCase(
  sourceFileTestCases: SourceFileTestCaseMap,
  sourceFileName: string,
  functionName: string,
  index: number,
  updater: (prevTestCase?: FunctionTestCase) => FunctionTestCase
) {
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
            updateFunctionTestCase(
              draftTestCases.functionTestCases[functionTestCaseIndex],
              index,
              updater
            );
        } else {
          draftTestCases.functionTestCases.push(
            updateFunctionTestCase(
              { functionName, testCases: [] },
              index,
              updater
            )
          );
        }
      }
    );
  });
}
