// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {
  makeSerializable,
  MaybeSelectedFunction,
  SourceFileMap,
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

  const state = new Map<string, any>();

  // Set defaults so that recoil sync's custom() does not explode
  state.set("app.debugMode", false);
  state.set("sources", {});
  state.set("selectedFunction", null);
  state.set("testCases", {});
  let nativeSources: SourceFileMap = {};

  const outputsWebviewProvider = registerWebView(
    extensionContext,
    "imaginary.currentfunctions",
    "function-panel",
    state
  );
  const inputsWebviewProvider = registerWebView(
    extensionContext,
    "imaginary.inputs",
    "input-panel",
    state
  );
  const messageRouter = new ImaginaryMessageRouter([
    outputsWebviewProvider,
    inputsWebviewProvider,
  ]);
  extensionContext.subscriptions.push(messageRouter);

  // These are all the local states in the extension.
  const functionTreeProvider = new ImaginaryFunctionProvider(nativeSources);
  vscode.window.createTreeView("functions", {
    treeDataProvider: functionTreeProvider,
  });
  vscode.commands.registerCommand("imaginary.clickFunction", focusNode);

  extensionContext.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      console.info("onDidChangeTextDocument", e.document.fileName, e.reason);

      nativeSources = updateFile(nativeSources, e.document);
      updateSourceState(
        nativeSources,
        state,
        functionTreeProvider,
        messageRouter
      );
    })
  );

  extensionContext.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      console.info("onDidOpenTextDocument", document.fileName);

      nativeSources = updateFile(nativeSources, document);
      updateSourceState(
        nativeSources,
        state,
        functionTreeProvider,
        messageRouter
      );
    })
  );
  extensionContext.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      console.info("onDidCloseTextDocument", document.fileName);

      nativeSources = removeFile(document, nativeSources);
      updateSourceState(
        nativeSources,
        state,
        functionTreeProvider,
        messageRouter
      );
    })
  );
  extensionContext.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      // TODO: update tree view with treeView.reveal()
      const { textEditor } = e;
      const selectedFunction = updateViewsWithSelection(
        state.get("selectedFunction"),
        nativeSources,
        textEditor
      );
      state.set("selectedFunction", selectedFunction);
      messageRouter.updateState({ selectedFunction });
    })
  );
  {
    nativeSources = initializeOpenEditors(nativeSources, functionTreeProvider);
    updateSourceState(
      nativeSources,
      state,
      functionTreeProvider,
      messageRouter
    );
    const selectedFunction = initializeSelection(
      state.get("selectedFunction"),
      nativeSources
    );
    state.set("selectedFunction", selectedFunction);
    messageRouter.updateState({ selectedFunction });
  }
}

/** Broadcast all changes to sources */
function updateSourceState(
  nativeSources: Readonly<SourceFileMap>,
  state: Map<string, any>,
  functionTreeProvider: ImaginaryFunctionProvider,
  messageRouter: ImaginaryMessageRouter
) {
  const sources = makeSerializable(nativeSources);

  functionTreeProvider.update(nativeSources);
  state.set("sources", sources);
  messageRouter.updateState({ sources });
}

function initializeSelection(
  selectedFunction: MaybeSelectedFunction,
  sources: Readonly<SourceFileMap>
) {
  if (vscode.window.activeTextEditor) {
    const textEditor = vscode.window.activeTextEditor;
    selectedFunction = updateViewsWithSelection(
      selectedFunction,
      sources,
      textEditor
    );
  }
  return selectedFunction;
}

function updateViewsWithSelection(
  selectedFunction: MaybeSelectedFunction,
  sources: Readonly<SourceFileMap>,
  textEditor: vscode.TextEditor
) {
  const newSelection = getEditorSelectedFunction(
    selectedFunction,
    sources,
    textEditor
  );
  if (newSelection !== selectedFunction) {
    selectedFunction = newSelection;
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
