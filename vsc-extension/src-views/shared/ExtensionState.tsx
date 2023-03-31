/* eslint-disable @typescript-eslint/naming-convention */
import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  MaybeSelectedFunction,
  SerializableSourceFileMap,
} from "../../src-shared/source-info";

/** Main hook that wires up all messaging to/from this webview */
function useExtensionStateInternal() {
  // Local copies of state as broadcast from extension host
  const [sources, setSources] = useState<SerializableSourceFileMap>({});
  const [selectedFunction, setSelectedFunction] =
    useState<MaybeSelectedFunction>(null);

  // Synchronize states by listening for events
  useEffect(() => {
    window.addEventListener("message", (event) => {
      switch (event.data.id as string) {
        case "update-sources": {
          const [sources] = event.data.params as [
            sources: SerializableSourceFileMap
          ];
          console.log("got sources: ", sources);
          setSources(sources);
          break;
        }
        case "update-selection": {
          const [selection] = event.data.params as [
            selection: MaybeSelectedFunction
          ];
          setSelectedFunction(selection);
          break;
        }
        default:
          console.log("Unknmown message: ", event);
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
  return { sendMessage, sources, selectedFunction };
}

const ExtensionState = createContext<
  ReturnType<typeof useExtensionStateInternal>
>({
  selectedFunction: null,
  sources: {},
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
