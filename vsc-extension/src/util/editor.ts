import path, { join, relative } from "path";
import ts from "typescript";
import vscode from "vscode";
import { MaybeSelectedFunction } from "../../src-shared/source-info";
import { SourceFileMap } from "./ts-source";

export function getRelativePathToProject(absPath: string) {
  const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (projectPath) {
    return relative(projectPath, absPath);
  }
  console.error(`No paths in ${vscode.workspace.workspaceFolders}`);
  return absPath;
}

export function getAbsolutePathInProject(relPath: string) {
  const projectPathUri = vscode.workspace.workspaceFolders?.[0].uri;
  if (!projectPathUri) {
    if (!path.isAbsolute(relPath)) {
      // if there is no workspace, we assume `getRelativePathToProject` returned
      // an absolute path. If not, then who knows what went wrong!
      console.warn(`Cannot resolve relative path${relPath}, using as-is`);
    }
    return relPath;
  }
  return vscode.Uri.joinPath(projectPathUri, relPath).fsPath;
}

/**
 * Open an editor with the cursor at the start of the function
 * @param decl The AST node to put the cursor at
 * @param sourceFile The source file
 */
export const focusNode = async (
  decl: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile
) => {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) {
    return;
  }
  const f = await vscode.workspace.openTextDocument(
    join(ws.uri.fsPath, sourceFile.fileName)
  );
  const declLocation = sourceFile.getLineAndCharacterOfPosition(
    decl.getStart(sourceFile)
  );
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
        // `pos` is actually the position of the first non-code before the
        // function. i.e. it is just before any leading comments/tsdocs. this
        // means we treat being in the docstring as being in the function
        const start = fn.pos;
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
