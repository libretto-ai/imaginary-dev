// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { MaybeSelectedFunction } from "../src-shared/source-info";
import { ImaginaryFunctionProvider } from "./function-tree-provider";
import { ImaginaryMessageRouter } from "./imaginary-message-router";
import { makeRpcHandlers } from "./rpc-handlers";
import {
  focusNode,
  getEditorSelectedFunction,
  getRelativePathToProject,
} from "./util/editor";
import { ExtensionHostState } from "./util/extension-state";
import { loadTestCases, writeAllTestCases } from "./util/persistence";
import { registerWebView } from "./util/react-webview-provider";
import { SecretsProxy, SECRET_OPENAI_API_KEY } from "./util/secrets";
import { makeSerializable } from "./util/serialize-source";
import {
  couldContainImaginaryFunctions,
  removeFile,
  updateFile,
} from "./util/source";
import { State } from "./util/state";
import { SourceFileMap } from "./util/ts-source";
import { TypedMap } from "./util/types";
import { createWatchedMap, TypedMapWithEvent } from "./util/watched-map";

const initialState: State = {
  "app.debugMode": false,
  selectedFunction: null,
  sources: {},
  testCases: {},
  selectedTestCases: {},
  acceptedTestOutput: {},
  latestTestOutput: {},
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(extensionContext: vscode.ExtensionContext) {
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

  // if we have an OpenAI API key, put it into process.env.OPENAI_API_KEY
  const secretsProxy = new SecretsProxy(extensionContext);
  const openAiApiKey = await secretsProxy.getSecretWithoutUserPrompt(
    SECRET_OPENAI_API_KEY
  );
  if (openAiApiKey) {
    if (process?.env) {
      (process.env as Record<string, any>).OPENAI_API_KEY = openAiApiKey;
    }
  }
  const rawState: TypedMap<State> = new Map();
  const state = createWatchedMap(rawState);
  Object.entries(initialState).forEach(([key, value]) => {
    state.set(key as keyof State, value);
  });

  const localState: TypedMap<ExtensionHostState> = new Map();

  const rpcHandlers = makeRpcHandlers(extensionContext, state, localState);
  const outputsWebviewProvider = registerWebView(
    extensionContext,
    "imaginary.currentfunctions",
    "function-panel",
    state,
    rpcHandlers
  );
  const inputsWebviewProvider = registerWebView(
    extensionContext,
    "imaginary.inputs",
    "input-panel",
    state,
    rpcHandlers
  );
  const messageRouter = new ImaginaryMessageRouter([
    outputsWebviewProvider,
    inputsWebviewProvider,
  ]);
  extensionContext.subscriptions.push(messageRouter);

  // These are all the local states in the extension.
  const functionTreeProvider = new ImaginaryFunctionProvider(
    localState.get("nativeSources")
  );
  vscode.window.createTreeView("functions", {
    treeDataProvider: functionTreeProvider,
  });
  vscode.commands.registerCommand("imaginary.clickFunction", focusNode);
  vscode.commands.registerCommand("imaginary.clearOpenAIApiKey", async () => {
    await secretsProxy.clearSecret(SECRET_OPENAI_API_KEY);
    vscode.window.showInformationMessage("OpenAI API Key has been cleared");
  });

  extensionContext.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      console.info("onDidChangeTextDocument", e.document.fileName, e.reason);

      const newSources = updateFile(
        localState.get("nativeSources"),
        e.document
      );
      localState.set("nativeSources", newSources);
      updateSourceState(
        localState.get("nativeSources"),
        state,
        functionTreeProvider
      );
    })
  );
  state.onStateChange(async (updatedState) => {
    messageRouter.updateState(updatedState);

    // NOTE: onStateChange does not wait for this promise to finish..
    if (updatedState.testCases || updatedState.latestTestOutput) {
      const testCases = updatedState.testCases ?? state.get("testCases");
      const outputs =
        updatedState.latestTestOutput ?? state.get("latestTestOutput");
      await writeAllTestCases(testCases, outputs);
    }
  });

  extensionContext.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (!couldContainImaginaryFunctions(document)) {
        return;
      }
      console.info("onDidOpenTextDocument", document.fileName);

      const newSources = updateFile(localState.get("nativeSources"), document);
      const fileName = document.fileName;
      await maybeLoadTestCases(fileName, state);
      localState.set("nativeSources", newSources);
      updateSourceState(
        localState.get("nativeSources"),
        state,
        functionTreeProvider
      );
    })
  );
  extensionContext.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (!couldContainImaginaryFunctions(document)) {
        return;
      }
      console.info("onDidCloseTextDocument", document.fileName);

      const newSources = removeFile(localState.get("nativeSources"), document);
      localState.set("nativeSources", newSources);
      updateSourceState(
        localState.get("nativeSources"),
        state,
        functionTreeProvider
      );
    })
  );
  extensionContext.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      // TODO: update tree view with treeView.reveal()
      const { textEditor } = e;
      const selectedFunction = updateViewsWithSelection(
        state.get("selectedFunction"),
        localState.get("nativeSources"),
        textEditor
      );
      state.set("selectedFunction", selectedFunction);
    })
  );
  initializeExtensionState(localState, state, functionTreeProvider);
}

async function maybeLoadTestCases(fileName: string, state: TypedMap<State>) {
  const sourceFileName = getRelativePathToProject(fileName);
  const { testCases, testOutputs } = await loadTestCases(sourceFileName);

  // TODO: Would be nice if we could do both updates in one go and/or debounce them in the WatchedTypeMap
  if (testCases.functionTestCases.length) {
    state.set("testCases", {
      ...state.get("testCases"),
      [sourceFileName]: testCases,
    });
  }
  if (testOutputs.functionOutputs.length) {
    state.set("latestTestOutput", {
      ...state.get("latestTestOutput"),
      [sourceFileName]: testOutputs,
    });
  }
}

async function initializeExtensionState(
  localState: TypedMap<ExtensionHostState>,
  state: TypedMapWithEvent<State>,
  functionTreeProvider: ImaginaryFunctionProvider
) {
  await initializeOpenEditors(localState, state, functionTreeProvider);
  updateSourceState(
    localState.get("nativeSources"),
    state,
    functionTreeProvider
  );

  const selectedFunction = initializeSelection(
    state.get("selectedFunction"),
    localState.get("nativeSources")
  );
  state.set("selectedFunction", selectedFunction);
}

/** Broadcast all changes to sources */
function updateSourceState(
  nativeSources: Readonly<SourceFileMap>,
  state: TypedMap<State>,
  functionTreeProvider: ImaginaryFunctionProvider
) {
  const sources = makeSerializable(nativeSources);

  functionTreeProvider.update(nativeSources);
  state.set("sources", sources);
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
async function initializeOpenEditors(
  localState: TypedMap<ExtensionHostState>,
  state: TypedMap<State>,
  functionTreeProvider: ImaginaryFunctionProvider
) {
  let updated = false;
  let sources = localState.get("nativeSources");
  vscode.window.visibleTextEditors.map(({ document }) => {
    sources = updateFile(sources, document);

    updated = true;
  });

  if (updated) {
    functionTreeProvider.update(sources);
    localState.set("nativeSources", sources);
  }
  const promises = vscode.window.visibleTextEditors.map(
    async ({ document }) => {
      console.log("trying to load test cases for ", document.fileName);
      await maybeLoadTestCases(document.fileName, state);
    }
  );
  await Promise.all(promises);
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
