import ts from "typescript";
import vscode from "vscode";
import { MaybeSelectedFunction } from "../../src-shared/source-info";
import { findImaginaryFunctions } from "./ast";
import {
  focusNode,
  getAbsolutePathInProject,
  getEditorSelectedFunction,
  getRelativePathToProject,
} from "./editor";
import { SourceFileMap } from "./ts-source";

describe("editor", () => {
  describe("getRelativePathToProject", () => {
    it("should return the relative path to the project", () => {
      const absPath = "/path/to/workspace/myFile.ts";
      expect(getRelativePathToProject(absPath)).toEqual("myFile.ts");
    });
    describe("with no workspace", () => {
      let ws;
      beforeEach(() => {
        ws = vscode.workspace.workspaceFolders;
        (vscode.workspace as any).workspaceFolders = undefined;
      });
      afterEach(() => {
        (vscode.workspace as any).workspaceFolders = ws;
        ws = null;
      });
      it("should return the raw path when there is no workspace", () => {
        const absPath = "/path/to/workspace/myFile.ts";
        expect(getRelativePathToProject(absPath)).toEqual(absPath);
      });
    });
  });

  describe("getAbsolutePathInProject", () => {
    it("should return the absolute path in the project", () => {
      const relPath = "myFile.ts";
      expect(getAbsolutePathInProject(relPath)).toEqual(
        "/path/to/workspace/myFile.ts"
      );
    });
    describe("with no workspace", () => {
      let ws;
      beforeEach(() => {
        ws = vscode.workspace.workspaceFolders;
        (vscode.workspace as any).workspaceFolders = undefined;
      });
      afterEach(() => {
        (vscode.workspace as any).workspaceFolders = ws;
        ws = null;
      });

      it("should return the absolute path in the project", () => {
        const relPath = "/path/to/workspace/myFile.ts";
        expect(getAbsolutePathInProject(relPath)).toEqual(relPath);
      });
    });
  });

  describe("focusNode", () => {
    it("should open the text document and show the function at the correct position", async () => {
      const sourceFile = ts.createSourceFile(
        "myFile.ts",
        `const foo = 1;
        /** @imaginary */
        declare function bar();`,
        ts.ScriptTarget.ES2015,
        true,
        ts.ScriptKind.TS
      );
      const [decl] = findImaginaryFunctions(sourceFile);

      await focusNode(decl, sourceFile);

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
        "/path/to/workspace/myFile.ts"
      );
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });
  });

  describe("getEditorSelectedFunction", () => {
    it("should return the selected function based on the text editor selection", () => {
      const selectedFunction: MaybeSelectedFunction = {
        fileName: "myFile.ts",
        functionName: "myFunction",
      };

      const sourceFile = ts.createSourceFile(
        "myFile.ts",
        `/** @imaginary */
        declare function myFunction();`,
        ts.ScriptTarget.ES2015,
        true,
        ts.ScriptKind.TS
      );
      const [node] = findImaginaryFunctions(sourceFile);
      const sources: SourceFileMap = {
        "myFile.ts": {
          sourceFile: sourceFile,
          functions: [node],
        },
      };

      const textEditor: any = {
        document: {
          fileName: "/path/to/workspace/myFile.ts",
        },
        selections: [
          {
            active: {
              line: 0,
              character: 0,
            },
          },
        ],
      };

      const result = getEditorSelectedFunction(
        selectedFunction,
        sources,
        textEditor
      );
      expect(result).toEqual(selectedFunction);
    });
  });
});
