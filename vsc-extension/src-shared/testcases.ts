import { produce } from "immer";
import {
  FunctionTestCase,
  FunctionTestCases,
  FunctionTestOutput,
  SourceFileTestCaseMap,
  SourceFileTestOutput,
  SourceFileTestOutputMap,
  TestOutput,
} from "./source-info";

export const blankTestCase: FunctionTestCase = {
  name: "New test",
  inputs: {},
};

export const blankTestOutput: TestOutput = {
  lastRun: "",
  output: {},
};

export function deleteFunctionTestCase(
  testCases: SourceFileTestCaseMap,
  sourceFileName: string,
  functionName: string,
  testCaseToDeleteIndex: number
): SourceFileTestCaseMap {
  const functionTestCases = findTestCases(
    testCases,
    sourceFileName,
    functionName
  );
  if (
    !functionTestCases ||
    functionTestCases.testCases.length <= testCaseToDeleteIndex
  ) {
    return testCases;
  }

  const functionTestCasesAfterDeletion =
    functionTestCases.testCases.filter(
      (_, index) => index !== testCaseToDeleteIndex
    ) ?? [];
  const fileTestCases = testCases[sourceFileName];

  return {
    ...testCases,
    [sourceFileName]: {
      sourceFileName,
      functionTestCases: fileTestCases.functionTestCases
        .filter(
          ({ functionName: thisFunctionName }) =>
            functionName !== thisFunctionName
        )
        .concat({ functionName, testCases: functionTestCasesAfterDeletion }),
    },
  };
}

export function deleteTestOutput(
  testOutputs: SourceFileTestOutputMap,
  sourceFileName: string,
  functionName: string,
  outputToDeleteIndex: number
): SourceFileTestOutputMap {
  const functionTestOutputs = findTestOutputs(
    testOutputs,
    sourceFileName,
    functionName
  );
  if (
    !functionTestOutputs ||
    functionTestOutputs.outputs.length <= outputToDeleteIndex
  ) {
    return testOutputs;
  }

  const functionTestOutputsAfterDeletion =
    functionTestOutputs.outputs.filter(
      (_, index) => index !== outputToDeleteIndex
    ) ?? [];
  const fileTestOutputs = testOutputs[sourceFileName];

  return {
    ...testOutputs,
    [sourceFileName]: {
      sourceFileName,
      functionOutputs: fileTestOutputs.functionOutputs
        .filter(
          ({ functionName: thisFunctionName }) =>
            functionName !== thisFunctionName
        )
        .concat({ functionName, outputs: functionTestOutputsAfterDeletion }),
    },
  };
}
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
      testCases: [newTestCase, ...prevFunctionTestCase.testCases],
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

export function findTestOutputs(
  testOutputs: SourceFileTestOutputMap,
  fileName?: string,
  functionNameTarget?: string
): FunctionTestOutput | undefined {
  if (!fileName || !functionNameTarget) {
    return;
  }
  return testOutputs[fileName]?.functionOutputs.find(
    ({ functionName }) => functionName === functionNameTarget
  );
}

export function findTestOutput(
  testOutputs: SourceFileTestOutputMap,
  fileName: string,
  functionName: string,
  testCaseIndex: number
): TestOutput | null {
  const functionTestOutput = findTestOutputs(
    testOutputs,
    fileName,
    functionName
  );
  if (
    !functionTestOutput ||
    testCaseIndex >= functionTestOutput.outputs.length
  ) {
    return null;
  }
  const testCase = functionTestOutput.outputs[testCaseIndex];
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

function updateFunctionTestOutput(
  functionOutputs: FunctionTestOutput,
  index: number,
  updater: (testOutput?: TestOutput) => TestOutput
): FunctionTestOutput {
  return produce(functionOutputs, (draft) => {
    draft.outputs = produce(draft.outputs, (draftOutputs) => {
      draftOutputs[index] = updater(draftOutputs[index]);
    });
  });
}
export function updateSourceFileTestOutput(
  sourceFileOutputs: SourceFileTestOutputMap,
  sourceFileName: string,
  functionName: string,
  index: number,
  updater: (testOutput?: TestOutput) => TestOutput
) {
  return produce(sourceFileOutputs, (draft) => {
    draft[sourceFileName] = produce(
      draft[sourceFileName] ??
        ({
          sourceFileName,
          functionOutputs: [],
        } satisfies SourceFileTestOutput),
      (draftFileTestOutput) => {
        const functionTestOutputIndex =
          draftFileTestOutput.functionOutputs.findIndex(
            (functionOutput) => functionOutput.functionName === functionName
          );
        if (functionTestOutputIndex !== -1) {
          draftFileTestOutput.functionOutputs[functionTestOutputIndex] =
            updateFunctionTestOutput(
              draftFileTestOutput.functionOutputs[functionTestOutputIndex],
              index,
              updater
            );
        } else {
          draftFileTestOutput.functionOutputs.push(
            updateFunctionTestOutput(
              { functionName, outputs: [] },
              index,
              updater
            )
          );
        }
      }
    );
  });
}
