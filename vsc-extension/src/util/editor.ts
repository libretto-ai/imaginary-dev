import { join, relative } from "path";
import * as ts from "typescript";
import * as vscode from "vscode";
import {
  MaybeSelectedFunction,
  SourceFileMap,
} from "../../src-shared/source-info";

export function getRelativePathToProject(absPath: string) {
  const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (projectPath) {
    return relative(projectPath, absPath);
  }
  return absPath;
}

/**
 * Open an editor with the cursor at the start of the function
 * @param decl The AST node to put the cursor at
 * @param sourceFile The source file
 */
export const focusNode = async (decl: ts.Node, sourceFile: ts.SourceFile) => {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    return;
  }
  const f = await vscode.workspace.openTextDocument(
    join(ws.uri.fsPath, sourceFile.fileName)
  );
  const declLocation = sourceFile.getLineAndCharacterOfPosition(decl.pos);
  const functionPosition = new vscode.Position(
    declLocation.line,
    declLocation.character
  );
  await vscode.window.showTextDocument(f, {
    selection: new vscode.Range(functionPosition, functionPosition),
  });
};

export function getEditorSelectedFunction(
  selectedFunction: MaybeSelectedFunction,
  sources: SourceFileMap,
  textEditor: vscode.TextEditor
) {
  const documentFileName = getRelativePathToProject(
    textEditor.document.fileName
  );

  const selections = textEditor.selections;
  if (!selections?.length) {
    return selectedFunction;
  }
  const selection = selections[0];

  let newSelection = selectedFunction;
  let found = false;
  Object.entries(sources).forEach(([fileName, fileInfo]) => {
    if (fileName === documentFileName) {
      const cursorPos = fileInfo.sourceFile.getPositionOfLineAndCharacter(
        selection.active.line,
        selection.active.character
      );
      fileInfo.functions.forEach((fn) => {
        const start = fn.getStart(fileInfo.sourceFile);
        const end = fn.getEnd();
        if (start <= cursorPos && cursorPos <= end) {
          const functionName = fn.name?.text;
          if (!functionName) {
            return;
          }
          newSelection = {
            fileName,
            functionName,
          };
          found = true;
        }
      });
    }
  });
  if (!found) {
    newSelection = null;
  }
  return newSelection;
}
