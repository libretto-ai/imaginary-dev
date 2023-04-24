import ts from "typescript";
import vscode from "vscode";
import { findImaginaryFunctions } from "./ast";
import { updateDiagnostics } from "./diagnostics";
import { SourceFileMap } from "./ts-source";

describe("diagnostics", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateDiagnostics", () => {
    it("should update diagnostics based on source files and document", () => {
      const sourceFile = ts.createSourceFile(
        "myFile.ts",
        `/** @imaginary */
        declare function noReturnValue();`,
        ts.ScriptTarget.ES2015,
        true,
        ts.ScriptKind.TS
      );
      const sources: SourceFileMap = {
        "myFile.ts": {
          sourceFile: sourceFile,
          functions: findImaginaryFunctions(sourceFile),
        },
      };

      const document: any = {
        fileName: "/path/to/workspace/myFile.ts",
        positionAt: jest.fn(() => new vscode.Position(0, 0)),
        uri: "file:///path/to/workspace/myFile.ts",
      };

      const collection = {
        set: jest.fn(),
      };

      updateDiagnostics(
        sources,
        document,
        collection as any as vscode.DiagnosticCollection
      );

      expect(document.positionAt).toHaveBeenCalled();
      expect(collection.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({
            message: "Imaginary function is missing return type.",
          }),
        ])
      );
    });
  });
});
