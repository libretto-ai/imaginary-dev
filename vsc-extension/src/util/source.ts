import * as ts from "typescript";
import * as vscode from "vscode";
import { findImaginaryFunctions } from "./ast";
import { getRelativePathToProject } from "./editor";
import { SourceFileMap } from "./ts-source";

export function removeFile(
  document: vscode.TextDocument,
  sources: Readonly<SourceFileMap>
): Readonly<SourceFileMap> {
  const relativeFilePath = getRelativePathToProject(document.fileName);
  // eslint-disable-next-line no-unused-vars
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

  const functions = findImaginaryFunctions(sourceFile);
  return {
    ...prevSources,
    [relativeFileName]: {
      functions,
      sourceFile,
    },
  };
}
