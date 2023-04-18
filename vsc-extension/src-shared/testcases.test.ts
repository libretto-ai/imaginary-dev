import { FunctionTestCase, SourceFileTestCaseMap } from "./source-info";
import {
  addFunctionTestCase,
  blankTestCase,
  findTestCases,
  updateSourceFileTestCase,
} from "./testcases";

describe("addFunctionTestCase", () => {
  it("should add a new test case for a new function", () => {
    const testCases: SourceFileTestCaseMap = {};
    const sourceFileName = "test-file.ts";
    const functionName = "newFunction";
    const newTestCase: FunctionTestCase = {
      name: "Test case 1",
      inputs: { a: 1, b: 2 },
    };

    const result = addFunctionTestCase(
      testCases,
      sourceFileName,
      functionName,
      newTestCase
    );

    expect(result).toEqual({
      [sourceFileName]: {
        sourceFileName,
        functionTestCases: [
          {
            functionName,
            testCases: [newTestCase],
          },
        ],
      },
    });
  });

  it("should add a new test case for an existing function", () => {
    const testCases: SourceFileTestCaseMap = {
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "existingFunction",
            testCases: [
              {
                name: "Test case 1",
                inputs: { a: 1, b: 2 },
              },
            ],
          },
        ],
      },
    };
    const sourceFileName = "test-file.ts";
    const functionName = "existingFunction";
    const newTestCase: FunctionTestCase = {
      name: "Test case 2",
      inputs: { a: 3, b: 4 },
    };

    const result = addFunctionTestCase(
      testCases,
      sourceFileName,
      functionName,
      newTestCase
    );

    expect(result).toEqual({
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "existingFunction",
            testCases: [
              {
                name: "Test case 1",
                inputs: { a: 1, b: 2 },
                output: { prev: null, current: null },
              },
              {
                name: "Test case 2",
                inputs: { a: 3, b: 4 },
                output: { prev: null, current: null },
              },
            ],
          },
        ],
      },
    });
  });
});

describe("findTestCases", () => {
  it("should return null when test cases not found for function", () => {
    const testCases: SourceFileTestCaseMap = {
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "existingFunction",
            testCases: [
              {
                name: "Test case 1",
                inputs: { a: 1, b: 2 },
              },
            ],
          },
        ],
      },
    };
    const fileName = "test-file.ts";
    const functionName = "nonExistingFunction";

    const result = findTestCases(testCases, fileName, functionName);

    expect(result).toBeUndefined();
  });

  it("should return test cases for function", () => {
    const testCases: SourceFileTestCaseMap = {
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "dummyFunction",
            testCases: [],
          },
          {
            functionName: "existingFunction",
            testCases: [
              {
                name: "Test case 1",
                inputs: { a: 1, b: 2 },
              },
            ],
          },
        ],
      },
      "dummy.ts": {
        sourceFileName: "dummy.ts",
        functionTestCases: [],
      },
    };
    const fileName = "test-file.ts";
    const functionName = "existingFunction";

    const result = findTestCases(testCases, fileName, functionName);

    expect(result).toEqual({
      functionName: "existingFunction",
      testCases: [
        {
          name: "Test case 1",
          inputs: { a: 1, b: 2 },
          output: { prev: null, current: null },
        },
      ],
    });
  });
});

describe("updateSourcefileTestCase", () => {
  it("should update an existing test case", () => {
    const sourceFileTestCases: SourceFileTestCaseMap = {
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "existingFunction",
            testCases: [
              {
                name: "Test case 1",
                inputs: { a: 1, b: 2 },
              },
            ],
          },
        ],
      },
    };
    const sourceFileName = "test-file.ts";
    const functionName = "existingFunction";
    const index = 0;
    const paramName = "a";
    const value = 3;
    const result = updateSourceFileTestCase(
      sourceFileTestCases,
      sourceFileName,
      functionName,
      index,
      (prevTestCase) => ({
        ...blankTestCase,
        ...prevTestCase,
        inputs: {
          ...prevTestCase?.inputs,
          [paramName]: value,
        },
      })
    );

    expect(result).toEqual({
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "existingFunction",
            testCases: [
              {
                name: "Test case 1",
                inputs: { a: 3, b: 2 },
                output: { prev: null, current: null },
              },
            ],
          },
        ],
      },
    });
  });

  it("should add a new test case for a new function", () => {
    const sourceFileTestCases: SourceFileTestCaseMap = {
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [],
      },
    };
    const sourceFileName = "test-file.ts";
    const functionName = "newFunction";
    const index = 0;
    const paramName = "a";
    const value = 1;
    const result = updateSourceFileTestCase(
      sourceFileTestCases,
      sourceFileName,
      functionName,
      index,
      (prevTestCase) => {
        return {
          ...blankTestCase,
          ...prevTestCase,
          inputs: {
            ...prevTestCase?.inputs,
            [paramName]: value,
          },
        };
      }
    );

    expect(result).toEqual({
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "newFunction",
            testCases: [
              {
                name: "New test",
                inputs: { a: 1 },
                output: { prev: null, current: null },
              },
            ],
          },
        ],
      },
    });
  });

  it("should add a new test case for an existing function", () => {
    const sourceFileTestCases: SourceFileTestCaseMap = {
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "existingFunction",
            testCases: [
              {
                name: "Test case 1",
                inputs: { a: 1, b: 2 },
              },
            ],
          },
        ],
      },
    };
    const sourceFileName = "test-file.ts";
    const functionName = "existingFunction";
    const index = 1;
    const paramName = "a";
    const value = 3;
    const result = updateSourceFileTestCase(
      sourceFileTestCases,
      sourceFileName,
      functionName,
      index,
      (prevTestCase) => ({
        ...blankTestCase,
        ...prevTestCase,
        inputs: {
          [paramName]: value,
        },
      })
    );

    expect(result).toEqual({
      "test-file.ts": {
        sourceFileName: "test-file.ts",
        functionTestCases: [
          {
            functionName: "existingFunction",
            testCases: [
              {
                name: "Test case 1",
                inputs: { a: 1, b: 2 },
                output: { prev: null, current: null },
              },
              {
                name: "New test",
                inputs: { a: 3 },
                output: { prev: null, current: null },
              },
            ],
          },
        ],
      },
    });
  });
});
