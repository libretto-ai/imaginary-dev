import { findMatchingFunction, MaybeSelectedFunction } from "./source-info";

describe("findMatchingFunction", () => {
  it("should return undefined if no selected function is provided", () => {
    const sources = {
      "test-file.ts": {
        sourceFile: {
          fileName: "test-file.ts",
        },
        functions: [],
      },
    };
    const selectedFunction: MaybeSelectedFunction = null;

    const result = findMatchingFunction(sources, selectedFunction);

    expect(result).toBeUndefined();
  });

  it("should return undefined if no matching source file is found", () => {
    const sources = {
      "test-file.ts": {
        sourceFile: {
          fileName: "test-file.ts",
        },
        functions: [],
      },
    };
    const selectedFunction: MaybeSelectedFunction = {
      fileName: "other-file.ts",
      functionName: "myFunction",
    };

    const result = findMatchingFunction(sources, selectedFunction);

    expect(result).toBeUndefined();
  });

  it("should return undefined if no matching function is found", () => {
    const sources = {
      "test-file.ts": {
        sourceFile: {
          fileName: "test-file.ts",
        },
        functions: [
          {
            name: "otherFunction",
            declaration: "",
            parameters: [],
          },
        ],
      },
    };
    const selectedFunction: MaybeSelectedFunction = {
      fileName: "test-file.ts",
      functionName: "myFunction",
    };

    const result = findMatchingFunction(sources, selectedFunction);

    expect(result).toBeUndefined();
  });

  it("should return the matching function", () => {
    const sources = {
      "test-file.ts": {
        sourceFile: {
          fileName: "test-file.ts",
        },
        functions: [
          {
            name: "myFunction",
            declaration: "",
            parameters: [],
          },
        ],
      },
    };
    const selectedFunction: MaybeSelectedFunction = {
      fileName: "test-file.ts",
      functionName: "myFunction",
    };

    const result = findMatchingFunction(sources, selectedFunction);

    expect(result).toEqual({
      name: "myFunction",
      declaration: "",
      parameters: [],
    });
  });
});
