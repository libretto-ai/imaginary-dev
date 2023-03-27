// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { relative } from "path";
import * as ts from "typescript";
import * as vscode from "vscode";
import { findFunctions } from "./ast-utils";
import { focusNode } from "./editor-utils";
import { ImaginaryFunctionProvider } from "./function-tree-provider";
import { SourceFileMap } from "./source-info";

function getRelativePathToProject(absPath: string) {
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
      const newSources = updateFile(sources, document);
      functionTreeProvider.update(newSources);
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      console.info("onDidCloseTextDocument", document.fileName);
      const relativeFilePath = getRelativePathToProject(document.fileName);
      const { [relativeFilePath]: removed, ...newSources } = sources;
      sources = newSources;
      functionTreeProvider.update(sources);
    })
  );
}

function updateFile(
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
// This method is called when your extension is deactivated
export function deactivate() {}
