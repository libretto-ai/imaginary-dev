import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { UnreachableCaseError } from "ts-essentials";
import { WebviewApi } from "vscode-webview";
import { RpcProvider } from "worker-rpc";
import { ImaginaryMessage } from "../../src-shared/messages";
import {
  MaybeSelectedFunction,
  SerializableSourceFileMap,
  SourceFileTestCaseMap,
} from "../../src-shared/source-info";

/** Main hook that wires up all messaging to/from this webview */
function useExtensionStateInternal() {
  // Local copies of state as broadcast from extension host
  const [sources, setSources] = useState<SerializableSourceFileMap>({});
  const [selectedFunction, setSelectedFunction] =
    useState<MaybeSelectedFunction>(null);
  const [testCases, setTestCases] = useState<SourceFileTestCaseMap>({});
  const [selectedTestCases, setSelectedTestCases] =
    useState<SourceFileTestCaseMap>({});
  const vscodeRef = useRef<WebviewApi<unknown>>();
  const [rpcProvider, setRpcProvider] = useState<RpcProvider>();

  // Synchronize states by listening for events
  useEffect(() => {
    vscodeRef.current = acquireVsCodeApi();
    const rpcProvider = new RpcProvider((message, transfer) => {
      // Used to send an RPC message out to the extension, i.e. to originate a call
      const msg = {
        id: "rpc",
        params: [message, transfer],
      } satisfies ImaginaryMessage;
      vscodeRef.current?.postMessage(msg);
    });
    rpcProvider.registerRpcHandler("getViewOrigin", async (payload: string) => {
      console.log("Handler in view with payload:", payload);
      return window.origin;
    });
    setRpcProvider(rpcProvider);
    window.addEventListener("message", (event) => {
      const message: ImaginaryMessage = event.data;

      console.log(
        `[${window.origin}] Got ${message.id} from ${event.origin} /`,
        event
      );

      switch (message.id) {
        case "update-sources": {
          const [sources] = message.params;
          console.log("got sources: ", sources);
          return setSources(sources);
        }
        case "update-function-selection": {
          const [selection] = message.params;
          return setSelectedFunction(selection);
        }
        case "update-testcases": {
          const [testCases] = message.params;
          return setTestCases(testCases);
        }
        case "update-selected-test-cases": {
          const [selectedTestCases] = message.params;
          return setSelectedTestCases(selectedTestCases);
        }
        case "rpc": {
          // Called when we get a response from a call - rpcMessage will be the resolution of the promise
          const [rpcMessage, transfer] = message.params;
          if (transfer?.length) {
            console.error("Unexpected transfer param from 'rpc' message");
          }
          rpcProvider.dispatch(rpcMessage);
          return;
        }

        default:
          throw new UnreachableCaseError(message);
      }
    });
  }, []);

  // Provide a standardized communication channel back to the extension host
  const sendMessage = useCallback(
    <M extends ImaginaryMessage, K extends M["id"], T extends M["params"]>(
      messageId: K,
      ...params: T
    ) => {
      const message = {
        id: messageId,
        params,
      } as M;
      console.log("broadcasting: ", message);

      vscodeRef.current?.postMessage(message);
    },
    []
  );

  // TODO: this boilerplate sucks. We don't get rebroadcast that stuff has
  // changed, so we need to update local state instead. It would be better to
  // automatically send the update message when `setTestCases` is called. This
  // is a good place to integrate recoil/recoil-sync or another stateful library
  // that can persist state

  const updateTestCases: React.Dispatch<
    React.SetStateAction<SourceFileTestCaseMap>
  > = (newValueOrUpdate) => {
    if (typeof newValueOrUpdate === "function") {
      const newValue = newValueOrUpdate(testCases);
      setTestCases(newValue);
      if (newValue !== testCases) {
        sendMessage("update-testcases", newValue);
      }
    } else {
      setTestCases(newValueOrUpdate);
      sendMessage("update-testcases", newValueOrUpdate);
    }
  };

  return {
    sources,
    selectedFunction,
    testCases,
    updateTestCases,
    selectedTestCases,
    rpcProvider: rpcProvider,
  };
}

const ExtensionState = createContext<
  ReturnType<typeof useExtensionStateInternal>
>({
  selectedFunction: null,
  sources: {},
  testCases: {},
  selectedTestCases: {},
  updateTestCases: () => {},
  rpcProvider: undefined,
});

/**
 * Get the Extension state, as synchronized from the extension host. Make sure to
 * wrap consumers with `<ExtensionStateProvider>` */
export function useExtensionState() {
  return useContext(ExtensionState);
}

/**
 * React context provider for Extension state. Allows use of `useExtensionState`.
 */
export const ExtensionStateProvider: FC<PropsWithChildren> = ({ children }) => {
  const state = useExtensionStateInternal();
  return (
    <ExtensionState.Provider value={state}>{children}</ExtensionState.Provider>
  );
};
