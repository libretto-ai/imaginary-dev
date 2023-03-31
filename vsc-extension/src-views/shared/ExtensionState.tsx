import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { UnreachableCaseError } from "ts-essentials";
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

  // Synchronize states by listening for events
  useEffect(() => {
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
    <P extends any[]>(messageId: string, ...params: P) => {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        id: messageId,
        params,
      });
    },
    []
  );
  return { sendMessage, sources, selectedFunction, testCases };
}

const ExtensionState = createContext<
  ReturnType<typeof useExtensionStateInternal>
>({
  selectedFunction: null,
  sources: {},
  testCases: {},
  sendMessage: () => {},
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
