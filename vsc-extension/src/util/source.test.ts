import ts from "typescript";
import vscode from "vscode";
import { removeFile, updateFile } from "./source";

describe("removeFile", () => {
  test("removes file from sources", () => {
    const sources = {
      "file1.ts": {
        functions: [],
        sourceFile: ts.createSourceFile("file1.ts", "", ts.ScriptTarget.Latest),
      },
      "file2.ts": {
        functions: [],
        sourceFile: ts.createSourceFile("file2.ts", "", ts.ScriptTarget.Latest),
      },
    };

    const workspacePath = vscode.workspace.workspaceFolders?.[0]
      .uri as vscode.Uri;
    const document = {
      fileName: vscode.Uri.joinPath(workspacePath, "file1.ts").fsPath,
    } as vscode.TextDocument;

    const newSources = removeFile(sources, document);

    expect(newSources).toEqual({
      "file2.ts": {
        functions: [],
        sourceFile: ts.createSourceFile("file2.ts", "", ts.ScriptTarget.Latest),
      },
    });
  });
});

describe("updateFile", () => {
  test("does nothing for non-typescript files", () => {
    const sources = {
      "file1.js": {
        functions: [],
        sourceFile: ts.createSourceFile("file1.js", "", ts.ScriptTarget.Latest),
      },
    };

    const document = {
      fileName: "file1.js",
      languageId: "javascript",
    } as vscode.TextDocument;

    const newSources = updateFile(sources, document);

    expect(newSources).toEqual(sources);
  });

  test("does nothing for git scheme files", () => {
    const sources = {
      "file1.ts": {
        functions: [],
        sourceFile: ts.createSourceFile("file1.ts", "", ts.ScriptTarget.Latest),
      },
    };

    const document = {
      fileName: "file1.ts",
      languageId: "typescript",
      uri: { scheme: "git" },
    } as vscode.TextDocument;

    const newSources = updateFile(sources, document);

    expect(newSources).toEqual(sources);
  });

  test("adds source file to sources for typescript files with imaginary functions", () => {
    const sources = {
      "file1.ts": {
        functions: [],
        sourceFile: ts.createSourceFile("file1.ts", "", ts.ScriptTarget.Latest),
      },
    };
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
      .uri as vscode.Uri;

    const document = {
      fileName: vscode.Uri.joinPath(workspaceFolder, "file2.ts").fsPath,
      languageId: "typescript",
      getText: () => `
      /** @imaginary */
      function fn() { }`,
      uri: { scheme: "file" },
    } as vscode.TextDocument;

    const newSources = updateFile(sources, document);

    expect(Object.keys(newSources)).toContain("file2.ts");
    expect(newSources["file2.ts"].functions).toHaveLength(1);
    expect(newSources["file2.ts"].functions[0].name?.text).toEqual("fn");
  });
});
