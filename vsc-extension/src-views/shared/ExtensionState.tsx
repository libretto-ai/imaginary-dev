import React, {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { UnreachableCaseError } from "ts-essentials";
import { WebviewApi } from "vscode-webview";
import { RpcProvider } from "worker-rpc";
import { ImaginaryMessage } from "../../src-shared/messages";
import { SerializableSourceFileMap } from "../../src-shared/source-info";

/** Main hook that wires up all messaging to/from this webview */
function useExtensionStateInternal() {
  // Local copies of state as broadcast from extension host
  const [sources, setSources] = useState<SerializableSourceFileMap>({});
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

  return {
    sources,
    rpcProvider: rpcProvider,
  };
}

const ExtensionState = createContext<
  ReturnType<typeof useExtensionStateInternal>
>({
  // selectedFunction: null,
  sources: {},
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
