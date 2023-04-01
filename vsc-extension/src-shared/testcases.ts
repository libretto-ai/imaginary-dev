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
  fileName: string,
  functionNameTarget: string
) {
  return testCases[fileName]?.functionTestCases.find(
    ({ functionName }) => functionName === functionNameTarget
  );
}
