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

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "imaginary-programming" is now active!'
  );

  const sources: SourceFileMap = {};

  const functionTreeProvider = new ImaginaryFunctionProvider(sources);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("functions", functionTreeProvider)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      updateFile(sources, e.document);
      functionTreeProvider.refresh();
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      updateFile(sources, document);
      functionTreeProvider.refresh();
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      const relativeFilePath = getRelativePathToProject(document.fileName);
      delete sources[relativeFilePath];
      functionTreeProvider.refresh();
    })
  );
}

function updateFile(sources: SourceFileMap, document: vscode.TextDocument) {
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
