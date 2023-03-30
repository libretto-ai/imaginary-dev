// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { relative } from "path";
import * as vscode from "vscode";
import {
  MaybeSelectedFunction,
  SourceFileMap,
} from "../src-shared/source-info";
import { focusNode } from "./editor-utils";
import { ImaginaryFunctionProvider } from "./function-tree-provider";
import { registerWebView } from "./react-webview-provider";
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
export function activate(extensionContext: vscode.ExtensionContext) {
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

  const outputsWebviewProvider = registerWebView(
    extensionContext,
    "imaginary.currentfunctions",
    "function-panel"
  );
  registerWebView(extensionContext, "imaginary.inputs", "input-panel");

  let sources: Readonly<SourceFileMap> = {};

  let currentFunction: MaybeSelectedFunction = null;

  const functionTreeProvider = new ImaginaryFunctionProvider(sources);
  const treeView = vscode.window.createTreeView("functions", {
    treeDataProvider: functionTreeProvider,
  });
  vscode.commands.registerCommand("imaginary.clickFunction", focusNode);

  extensionContext.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      console.info("onDidChangeTextDocument", e.document.fileName, e.reason);
      sources = updateFile(sources, e.document);
      functionTreeProvider.update(sources);
      outputsWebviewProvider.updateSources(sources);
    })
  );

  extensionContext.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      console.info("onDidOpenTextDocument", document.fileName);
      sources = updateFile(sources, document);

      functionTreeProvider.update(sources);
      outputsWebviewProvider.updateSources(sources);
    })
  );
  extensionContext.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      console.info("onDidCloseTextDocument", document.fileName);
      sources = removeFile(document, sources);
      functionTreeProvider.update(sources);
      outputsWebviewProvider.updateSources(sources);
    })
  );
  extensionContext.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      const documentFileName = getRelativePathToProject(
        e.textEditor.document.fileName
      );

      const selection = e.selections[0];
      if (!selection) {
        return;
      }

      let newSelection = currentFunction;
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
              console.log("found! ", currentFunction);
            }
          });
        }
      });
      if (!found) {
        newSelection = null;
      }
      if (newSelection !== currentFunction) {
        currentFunction = newSelection;
        outputsWebviewProvider.updateSelection(newSelection);
      }
    })
  );

  sources = initializeOpenEditors(sources, functionTreeProvider);
}

/**
 * onDidOpenTextDocument does not fire for editors that are already open when
 * the extension initializes, so we do it here.
 */
function initializeOpenEditors(
  sources: Readonly<SourceFileMap>,
  functionTreeProvider: ImaginaryFunctionProvider
) {
  let updated = false;
  vscode.window.visibleTextEditors.forEach(({ document }) => {
    sources = updateFile(sources, document);
    updated = true;
  });
  if (updated) {
    functionTreeProvider.update(sources);
  }
  return sources;
}

// This method is called when your extension is deactivated
export function deactivate() {}
