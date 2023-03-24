// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { getImaginaryTsDocComments } from "@imaginary-dev/typescript-transformer";
import { relative } from "path";
import * as ts from "typescript";
import * as vscode from "vscode";
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
  console.log("activation!");

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "imaginary-programming" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "imaginary-programming.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello World from Imaginary Programming!"
      );
    }
  );

  context.subscriptions.push(disposable);

  const sources: SourceFileMap = {};

  const functionTreeProvider = new ImaginaryFunctionProvider(sources);
  const rtdp = vscode.window.registerTreeDataProvider(
    "functions",
    functionTreeProvider
  );
  context.subscriptions.push(rtdp);

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      updateFile(e.document);
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      updateFile(document);
    })
  );

  function updateFile(document: vscode.TextDocument) {
    console.log(
      "updateFile",
      document.fileName,
      document.languageId,
      document.uri.scheme
    );
    if (document.languageId !== "typescript" || document.uri.scheme === "git") {
      return;
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
    sources[relativeFileName] = {
      functions,
      sourceFile,
    };
    functionTreeProvider.refresh();
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}

function findFunctions(sourceFile: ts.SourceFile) {
  const imaginaryFunctions: ts.FunctionDeclaration[] = [];
  const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
    if (ts.isFunctionDeclaration(node)) {
      const tsDocComments = getImaginaryTsDocComments(node, sourceFile);
      if (tsDocComments.length === 1) {
        imaginaryFunctions.push(node);
      }
    }
    return ts.forEachChild(node, visitor);
  };

  visitor(sourceFile);
  return imaginaryFunctions;
}
