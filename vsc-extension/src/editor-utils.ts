import { join } from "path";
import * as ts from "typescript";
import * as vscode from "vscode";

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
