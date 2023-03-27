import * as ts from "typescript";
import * as vscode from "vscode";
import { findFunctions } from "./ast-utils";
import { getRelativePathToProject } from "./extension";
import { SourceFileMap } from "./source-info";

export function removeFile(
  document: vscode.TextDocument,
  sources: Readonly<SourceFileMap>
) {
  const relativeFilePath = getRelativePathToProject(document.fileName);
  const { [relativeFilePath]: removed, ...newSources } = sources;
  return newSources;
}
export function updateFile(
  prevSources: Readonly<SourceFileMap>,
  document: vscode.TextDocument
): Readonly<SourceFileMap> {
  if (
    (document.languageId !== "typescript" &&
      document.languageId !== "typescriptreact") ||
    document.uri.scheme === "git"
  ) {
    console.log("skipping because ", document.languageId);
    return prevSources;
  }

  const { fileName } = document;
  const relativeFileName = getRelativePathToProject(fileName);
  const code = document.getText();

  const sourceFile = ts.createSourceFile(
    relativeFileName,
    code,
    // TODO: get this from tsconfig for the project
    ts.ScriptTarget.Latest
  );

  const functions = findFunctions(sourceFile);
  return {
    ...prevSources,
    [relativeFileName]: {
      functions,
      sourceFile,
    },
  };
}
