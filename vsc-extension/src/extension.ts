// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { relative } from "path";
import * as vscode from "vscode";
import {
  MaybeSelectedFunction,
  SourceFileMap,
} from "../src-shared/source-info";
import { focusNode, getEditorSelectedFunction } from "./editor-utils";
import { ImaginaryFunctionProvider } from "./function-tree-provider";
import {
  ReactWebViewProvider,
  registerWebView,
} from "./react-webview-provider";
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

  let selectedFunction: MaybeSelectedFunction = null;

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
      const { textEditor } = e;
      selectedFunction = updateViewsWithSelection(
        selectedFunction,
        sources,
        textEditor,
        outputsWebviewProvider
      );
    })
  );
  sources = initializeOpenEditors(sources, functionTreeProvider);
  selectedFunction = initializeSelection(
    selectedFunction,
    sources,
    outputsWebviewProvider
  );
}

function initializeSelection(
  selectedFunction: MaybeSelectedFunction,
  sources: Readonly<SourceFileMap>,
  outputsWebviewProvider: ReactWebViewProvider
) {
  if (vscode.window.activeTextEditor) {
    const textEditor = vscode.window.activeTextEditor;
    selectedFunction = updateViewsWithSelection(
      selectedFunction,
      sources,
      textEditor,
      outputsWebviewProvider
    );
  }
  return selectedFunction;
}

function updateViewsWithSelection(
  selectedFunction: MaybeSelectedFunction,
  sources: Readonly<SourceFileMap>,
  textEditor: vscode.TextEditor,
  outputsWebviewProvider: ReactWebViewProvider
) {
  const newSelection = getEditorSelectedFunction(
    selectedFunction,
    sources,
    textEditor
  );
  if (newSelection !== selectedFunction) {
    selectedFunction = newSelection;
    outputsWebviewProvider.updateSelection(newSelection);
  }
  return selectedFunction;
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
