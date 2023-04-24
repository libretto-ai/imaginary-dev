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

jest.mock("vscode", () => {
  const { URI: Uri, Utils } = jest.requireActual("vscode-uri");
  Uri.joinPath = Utils.joinPath;

  return {
    Uri,
    workspace: {
      workspaceFolders: [
        {
          uri: Uri.file("/path/to/workspace"),
        },
      ],
      openTextDocument: jest.fn(),
    },
    window: {
      showTextDocument: jest.fn(),
    },
    Position: jest.fn().mockImplementation(function (): vscode.Position {
      return {
        line: 0,
        character: 0,
        isBefore(other) {
          return false;
        },
        compareTo(other) {
          return 0;
        },
        isAfter(other) {
          return false;
        },
        isAfterOrEqual(other) {
          return false;
        },
        isBeforeOrEqual(other) {
          return false;
        },
        isEqual(other) {
          return false;
        },
        translate() {
          return this;
        },
        with() {
          return this;
        },
      };
    }),
    Range: jest.fn(),
  };
});
vscode.Position;
// Importing the mocked vscode module

describe("editor", () => {
  describe("getRelativePathToProject", () => {
    it("should return the relative path to the project", () => {
      const absPath = "/path/to/workspace/myFile.ts";
      expect(getRelativePathToProject(absPath)).toEqual("myFile.ts");
    });
  });

  describe("getAbsolutePathInProject", () => {
    it("should return the absolute path in the project", () => {
      const relPath = "myFile.ts";
      expect(getAbsolutePathInProject(relPath)).toEqual(
        "/path/to/workspace/myFile.ts"
      );
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
