// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { distance } from "fastest-levenshtein";
import * as vscode from "vscode";
import {
  MaybeSelectedFunction,
  SerializableFunctionDeclaration,
  SerializableSourceFileMap,
  SourceFileTestCaseMap,
  SourceFileTestOutputMap,
} from "../src-shared/source-info";
import { ImaginaryFunctionProvider } from "./function-tree-provider";
import { ImaginaryMessageRouter } from "./imaginary-message-router";
import { makeRpcHandlers } from "./rpc-handlers";
import { makeSerializedAsyncFunction } from "./util/async";
import { updateDiagnostics } from "./util/diagnostics";
import {
  focusNode,
  getEditorSelectedFunction,
  getRelativePathToProject,
} from "./util/editor";
import { ExtensionHostState } from "./util/extension-state";
import { loadTestCases, writeAllTestCases } from "./util/persistence";
import {
  BaseRpcHandlers,
  registerWebView,
} from "./util/react-webview-provider";
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

const initialExtensionState: ExtensionHostState = {
  nativeSources: {},
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

  const diagnosticCollection = vscode.languages.createDiagnosticCollection(
    "imaginary-programming"
  );

  const rawState: TypedMap<State> = new Map();
  const state = createWatchedMap(rawState);
  Object.entries(initialState).forEach(([key, value]) => {
    state.set(key as keyof State, value);
  });

  const localState: TypedMap<ExtensionHostState> = new Map();
  Object.entries(initialExtensionState).forEach(([key, value]) => {
    localState.set(key as keyof ExtensionHostState, value);
  });
  const rpcHandlers = makeRpcHandlers(extensionContext, state, localState);
  const outputsWebviewProvider = registerWebView(
    extensionContext,
    "imaginary.currentfunctions",
    "function-panel",
    state,
    rpcHandlers as BaseRpcHandlers
  );
  const inputsWebviewProvider = registerWebView(
    extensionContext,
    "imaginary.inputs",
    "input-panel",
    state,
    rpcHandlers as BaseRpcHandlers
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

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        e.document.uri
      );

      const relativeFileName = e.document.fileName.slice(
        (workspaceFolder?.uri.fsPath.length ?? 0) + 1
      );

      const preEditFunctions = getFunctions(
        relativeFileName,
        state.get("sources")
      );

      const newSources = updateFile(
        localState.get("nativeSources"),
        e.document
      );
      updateDiagnostics(newSources, e.document, diagnosticCollection);
      localState.set("nativeSources", newSources);
      updateSourceState(
        localState.get("nativeSources"),
        state,
        functionTreeProvider
      );

      const postEditFunctions = getFunctions(
        relativeFileName,
        state.get("sources")
      );

      handleProbableRenames(
        relativeFileName,
        e.contentChanges,
        preEditFunctions,
        postEditFunctions,
        state
      );
    })
  );
  const saveState = makeSerializedAsyncFunction(rawSaveState);

  state.onStateChange(async (updatedState) => {
    messageRouter.updateState(updatedState);

    // NOTE: onStateChange does not wait for this promise to finish..
    saveState(state);
  });

  extensionContext.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (!couldContainImaginaryFunctions(document)) {
        return;
      }
      console.info("onDidOpenTextDocument", document.fileName);

      const newSources = updateFile(localState.get("nativeSources"), document);
      updateDiagnostics(newSources, document, diagnosticCollection);
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

  initializeExtensionState(
    localState,
    state,
    functionTreeProvider,
    diagnosticCollection
  );
}

function getFunctions(fileName: string, sources: SerializableSourceFileMap) {
  return sources[fileName]?.functions ?? [];
}

function handleProbableRenames(
  fileName: string,
  contentChanges: readonly vscode.TextDocumentContentChangeEvent[],
  preEditFunctions: SerializableFunctionDeclaration[],
  postEditFunctions: SerializableFunctionDeclaration[],
  state: TypedMapWithEvent<State>
) {
  const preEditFunctionNames = preEditFunctions.map(({ name }) => name ?? "");
  const postEditFunctionNames = postEditFunctions.map(({ name }) => name ?? "");

  // first, let's look at functions that kept the same name and see if their params changed.
  const commonFunctionNames = preEditFunctionNames.filter((functionName) =>
    postEditFunctionNames.includes(functionName)
  );

  const preEditUniqueFunctionNames = preEditFunctionNames.filter(
    (functionName) => !commonFunctionNames.includes(functionName)
  );
  const postEditUniqueFunctionNames = postEditFunctionNames.filter(
    (functionName) => !commonFunctionNames.includes(functionName)
  );

  const totalCharsChanged = contentChanges.reduce(
    (sum, newValue) =>
      (sum += Math.max(newValue.text.length, newValue.rangeLength)),
    0
  );

  // create a map of pre-edit to post-edit probable changes, using Levenshtein distance
  const functionEditMap = new Map<string, string>();

  preEditUniqueFunctionNames.forEach((preEditFunctionName) => {
    postEditUniqueFunctionNames.forEach((postEditFunctionName) => {
      if (
        distance(preEditFunctionName, postEditFunctionName) <= totalCharsChanged
      ) {
        functionEditMap.set(preEditFunctionName, postEditFunctionName);
      }
    });
  });

  if (functionEditMap.size !== 0) {
    renameFunctions(state, fileName, functionEditMap);
  }

  // now figure out if any functions have renamed parameters
  commonFunctionNames.forEach((commonFunctionName) => {
    const preEditFunction = preEditFunctions.find(
      ({ name }) => name === commonFunctionName
    );
    const postEditFunction = postEditFunctions.find(
      ({ name }) => name === commonFunctionName
    );

    if (preEditFunction && postEditFunction) {
      preEditFunction.parameters.forEach((param, index) => {
        if (param.name !== postEditFunction.parameters[index].name) {
          renameFunctionParameter(
            state,
            fileName,
            commonFunctionName,
            param.name,
            postEditFunction.parameters[index].name
          );
        }
      });
    }
  });
}

function renameFunctionParameter(
  state: TypedMapWithEvent<State>,
  fileName: string,
  commonFunctionName: string,
  oldParamName: string,
  newParamName: string
) {
  const newTestCases = JSON.parse(
    JSON.stringify(state.get("testCases"))
  ) as SourceFileTestCaseMap;

  newTestCases[fileName]?.functionTestCases
    .find(({ functionName }) => functionName === commonFunctionName)
    ?.testCases.forEach(({ inputs }) => {
      Object.keys(inputs).forEach((paramName) => {
        if (paramName === oldParamName) {
          inputs[newParamName] = inputs[paramName];
          delete inputs[paramName];
        }
      });
    });

  state.set("testCases", newTestCases);
}

function renameFunctions(
  state: TypedMapWithEvent<State>,
  fileName: string,
  functionEditMap: Map<string, string>
) {
  const newTestCases = JSON.parse(
    JSON.stringify(state.get("testCases"))
  ) as SourceFileTestCaseMap;
  const newLatestTestOutputs = JSON.parse(
    JSON.stringify(state.get("latestTestOutput"))
  ) as SourceFileTestOutputMap;
  const newAcceptedTestOutputs = JSON.parse(
    JSON.stringify(state.get("acceptedTestOutput"))
  ) as SourceFileTestOutputMap;

  functionEditMap.forEach((newFnName, oldFnName) => {
    newTestCases[fileName]?.functionTestCases.forEach((functionTestCases) => {
      if (functionTestCases.functionName === oldFnName) {
        functionTestCases.functionName = newFnName;
      }
    });
    newLatestTestOutputs[fileName]?.functionOutputs.forEach(
      (functionOutputs) => {
        if (functionOutputs.functionName === oldFnName) {
          functionOutputs.functionName = newFnName;
        }
      }
    );
    newAcceptedTestOutputs[fileName]?.functionOutputs.forEach(
      (functionOutputs) => {
        if (functionOutputs.functionName === oldFnName) {
          functionOutputs.functionName = newFnName;
        }
      }
    );
  });

  state.set("testCases", newTestCases);
  state.set("latestTestOutput", newLatestTestOutputs);
  state.set("acceptedTestOutput", newAcceptedTestOutputs);
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
  functionTreeProvider: ImaginaryFunctionProvider,
  diagnosticCollection: vscode.DiagnosticCollection
) {
  await initializeOpenEditors(
    localState,
    state,
    functionTreeProvider,
    diagnosticCollection
  );
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
  functionTreeProvider: ImaginaryFunctionProvider,
  diagnosticCollection: vscode.DiagnosticCollection
) {
  let updated = false;
  let sources = localState.get("nativeSources");
  vscode.window.visibleTextEditors.map(({ document }) => {
    sources = updateFile(sources, document);
    updateDiagnostics(sources, document, diagnosticCollection);

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

async function rawSaveState(state: TypedMap<State>) {
  if (state.get("testCases") || state.get("latestTestOutput")) {
    const testCases = state.get("testCases");
    const outputs = state.get("latestTestOutput");
    await writeAllTestCases(testCases, outputs);
  }
}

// This method is called when your extension is deactivated
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
