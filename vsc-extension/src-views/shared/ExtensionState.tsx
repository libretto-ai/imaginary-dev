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
  const vscodeRef = useRef<WebviewApi<unknown>>();

  // Synchronize states by listening for events
  useEffect(() => {
    vscodeRef.current = acquireVsCodeApi();
    window.addEventListener("message", (event) => {
      const message: ImaginaryMessage = event.data;

      console.log(
        `[${window.location}] Got ${message.id} from ${event.origin} /`,
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
  const updateTestCases = useCallback(
    (newTestCases: SourceFileTestCaseMap) => {
      sendMessage("update-testcases", newTestCases);
      setTestCases(newTestCases);
    },
    [sendMessage]
  );
  return { sources, selectedFunction, testCases, updateTestCases };
}

const ExtensionState = createContext<
  ReturnType<typeof useExtensionStateInternal>
>({
  selectedFunction: null,
  sources: {},
  testCases: {},
  updateTestCases: () => {},
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
