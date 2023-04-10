import ts from "typescript";
import { SourceFileMap } from "../../src-shared/source-info";
import { makeSerializable } from "./serialize-source";

describe("makeSerializable", () => {
  it("should make a source file map serializable", () => {
    const sources: SourceFileMap = {
      "test-file.ts": {
        sourceFile: {
          fileName: "test-file.ts",
          text: "function myFunction() {}",
        } as ts.SourceFile,
        functions: [
          ts.factory.createFunctionDeclaration(
            undefined,
            undefined,
            "myFunction",
            undefined,
            [],
            undefined,
            ts.factory.createBlock([], true)
          ),
        ],
      },
    };

    const result = makeSerializable(sources);

    expect(result).toEqual({
      "test-file.ts": {
        sourceFile: {
          fileName: "test-file.ts",
        },
        functions: [
          {
            name: "myFunction",
            declaration: "function myFunction() {\n}",
            parameters: [],
          },
        ],
      },
    });
  });

  it("should handle functions with parameters", () => {
    const sources: SourceFileMap = {
      "test-file.ts": {
        sourceFile: {
          fileName: "test-file.ts",
          text: "function myFunction(a: number, b: string) {}",
        } as ts.SourceFile,
        functions: [
          ts.factory.createFunctionDeclaration(
            undefined,
            undefined,
            "myFunction",
            undefined,
            [
              ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                "a",
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                undefined
              ),
              ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                "b",
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                undefined
              ),
            ],
            undefined,
            ts.factory.createBlock([], true)
          ),
        ],
      },
    };

    const result = makeSerializable(sources);

    expect(result).toEqual({
      "test-file.ts": {
        sourceFile: {
          fileName: "test-file.ts",
        },
        functions: [
          {
            name: "myFunction",
            declaration: "function myFunction(a: number, b: string) {\n}",
            parameters: [
              {
                name: "a",
                tempType: "number",
              },
              {
                name: "b",
                tempType: "string",
              },
            ],
          },
        ],
      },
    });
  });
});
