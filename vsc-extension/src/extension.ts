// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { UnreachableCaseError } from "ts-essentials";
import * as vscode from "vscode";
import {
  MaybeSelectedFunction,
  SourceFileMap,
  SourceFileTestCaseMap,
} from "../src-shared/source-info";
import { ImaginaryFunctionProvider } from "./function-tree-provider";
import { ImaginaryMessageRouter } from "./imaginary-message-router";
import { focusNode, getEditorSelectedFunction } from "./util/editor";
import { registerWebView } from "./util/react-webview-provider";
import { removeFile, updateFile } from "./util/source";

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
  const inputsWebviewProvider = registerWebView(
    extensionContext,
    "imaginary.inputs",
    "input-panel"
  );
  const messageRouter = new ImaginaryMessageRouter([
    outputsWebviewProvider,
    inputsWebviewProvider,
  ]);
  extensionContext.subscriptions.push(messageRouter);

  extensionContext.subscriptions.push(
    messageRouter.onDidReceiveMessage((webviewMessage) => {
      const { message, webviewProvider } = webviewMessage;
      console.log(
        `[extension] Got ${message.id} from ${webviewProvider.viewId}`
      );
      switch (message.id) {
        case "update-sources":
          throw new Error("Only core extension is allowed to update sources");
        case "update-function-selection":
          selectedFunction = message.params[0];
          return messageRouter.updateFunctionSelection(
            selectedFunction,
            webviewProvider
          );

        case "update-testcases":
          testCases = message.params[0];
          return messageRouter.updateTestCases(testCases, webviewProvider);

        default:
          throw new UnreachableCaseError(message);
      }
    })
  );

  // These are all the local states in the extension.
  let sources: Readonly<SourceFileMap> = {};
  let selectedFunction: MaybeSelectedFunction = null;
  let testCases: Readonly<SourceFileTestCaseMap> = {};

  const functionTreeProvider = new ImaginaryFunctionProvider(sources);
  vscode.window.createTreeView("functions", {
    treeDataProvider: functionTreeProvider,
  });
  vscode.commands.registerCommand("imaginary.clickFunction", focusNode);

  extensionContext.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      console.info("onDidChangeTextDocument", e.document.fileName, e.reason);
      sources = updateFile(sources, e.document);
      functionTreeProvider.update(sources);
      messageRouter.updateSources(sources);
    })
  );

  extensionContext.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      console.info("onDidOpenTextDocument", document.fileName);
      sources = updateFile(sources, document);

      functionTreeProvider.update(sources);
      messageRouter.updateSources(sources);
    })
  );
  extensionContext.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      console.info("onDidCloseTextDocument", document.fileName);
      sources = removeFile(document, sources);
      functionTreeProvider.update(sources);
      messageRouter.updateSources(sources);
    })
  );
  extensionContext.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      const { textEditor } = e;
      selectedFunction = updateViewsWithSelection(
        selectedFunction,
        sources,
        textEditor,
        messageRouter
      );
    })
  );
  sources = initializeOpenEditors(sources, functionTreeProvider);
  selectedFunction = initializeSelection(
    selectedFunction,
    sources,
    messageRouter
  );
}

function initializeSelection(
  selectedFunction: MaybeSelectedFunction,
  sources: Readonly<SourceFileMap>,
  messageRouter: ImaginaryMessageRouter
) {
  if (vscode.window.activeTextEditor) {
    const textEditor = vscode.window.activeTextEditor;
    selectedFunction = updateViewsWithSelection(
      selectedFunction,
      sources,
      textEditor,
      messageRouter
    );
  }
  return selectedFunction;
}

function updateViewsWithSelection(
  selectedFunction: MaybeSelectedFunction,
  sources: Readonly<SourceFileMap>,
  textEditor: vscode.TextEditor,
  messageRouter: ImaginaryMessageRouter
) {
  const newSelection = getEditorSelectedFunction(
    selectedFunction,
    sources,
    textEditor
  );
  if (newSelection !== selectedFunction) {
    selectedFunction = newSelection;
    messageRouter.updateFunctionSelection(newSelection);
  }
  return newSelection;
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
