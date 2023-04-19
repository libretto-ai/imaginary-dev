import React, {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { WebviewApi } from "vscode-webview";
import { RpcProvider } from "worker-rpc";
import { ExtensionRpcProvider } from "../../src-shared/ExtensionRpcProvider";
import { ImaginaryMessage } from "../../src-shared/messages";
/** Main hook that wires up all messaging to/from this webview */
function useExtensionStateInternal() {
  // Local copies of state as broadcast from extension host
  const vscodeRef = useRef<WebviewApi<unknown>>();
  const [rpcProvider, setRpcProvider] = useState<ExtensionRpcProvider>();

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

      if (message.id === "rpc") {
        // Called when we get a response from a call - rpcMessage will be the resolution of the promise
        const [rpcMessage, transfer] = message.params;
        if (rpcMessage.id === "resolve_transaction") {
          console.log(
            `[${window.origin}] <= Return from call #${rpcMessage.transactionId}: `,
            rpcMessage.payload
          );
        } else {
          console.log(
            `[${window.origin}] => Calling ${rpcMessage.id} #${rpcMessage.transactionId} with parameters`,
            rpcMessage.payload
          );
        }
        if (transfer?.length) {
          console.error("Unexpected transfer param from 'rpc' message");
        }
        rpcProvider.dispatch(rpcMessage);
        return;
      } else {
        console.log(
          `[${window.origin}] Got "${message.id}" from ${event.origin} /`,
          event
        );
      }
      console.error("unknown message recieved");
    });
  }, []);

  return {
    rpcProvider: rpcProvider,
  };
}

const ExtensionState = createContext<
  ReturnType<typeof useExtensionStateInternal>
>({
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
