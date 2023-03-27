// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { relative } from "path";
import * as vscode from "vscode";
import { focusNode } from "./editor-utils";
import { ImaginaryFunctionProvider } from "./function-tree-provider";
import { SourceFileMap } from "./source-info";
import { removeFile, updateFile } from "./source-utils";

export function getRelativePathToProject(absPath: string) {
  const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (projectPath) {
    return relative(projectPath, absPath);
  }
  return absPath;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const ipChannel = vscode.window.createOutputChannel(
    "Imaginary Programming Extension"
  );
  // Log output to the channel
  console.log = (message) => {
    ipChannel.appendLine(message);
  };

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "imaginary-programming" is now active!'
  );

  let sources: Readonly<SourceFileMap> = {};

  const functionTreeProvider = new ImaginaryFunctionProvider(sources);
  const treeView = vscode.window.createTreeView("functions", {
    treeDataProvider: functionTreeProvider,
  });
  vscode.commands.registerCommand("imaginary.clickFunction", focusNode);

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      console.info("onDidChangeTextDocument", e.document.fileName, e.reason);
      sources = updateFile(sources, e.document);
      functionTreeProvider.update(sources);
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      console.info("onDidOpenTextDocument", document.fileName);
      sources = updateFile(sources, document);

      functionTreeProvider.update(sources);
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      console.info("onDidCloseTextDocument", document.fileName);
      sources = removeFile(document, sources);
      functionTreeProvider.update(sources);
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
