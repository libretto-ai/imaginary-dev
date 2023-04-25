import React, { FC, PropsWithChildren, useMemo } from "react";
import { DefaultValue } from "recoil";
import { ListenToItems, ReadItem, RecoilSync, WriteItems } from "recoil-sync";
import { ExtensionRpcProvider } from "../../src-shared/ExtensionRpcProvider";
import { State } from "../../src/util/state";
import { useExtensionState } from "./ExtensionState";

export const RecoilSyncWebview: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const { rpcProvider } = useExtensionState();

  const { reader, writer, listen } = useRpc(rpcProvider);
  if (!rpcProvider) {
    // do not render without an rpcProvider, because RecoilSync starts reading from the store immediately
    return null;
  }
  return (
    <RecoilSync read={reader} write={writer} listen={listen}>
      {children}
    </RecoilSync>
  );
};

function useRpc(rpcProvider: ExtensionRpcProvider | undefined): {
  reader: ReadItem;
  writer: WriteItems;
  listen: ListenToItems;
} {
  return useMemo(() => {
    if (!rpcProvider) {
      return {
        reader: (itemKey) => {
          console.warn(`[webview] reading ${itemKey} before provider is ready`);
          return new DefaultValue();
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        writer: () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        listen: () => {},
      };
    }
    const reader: ReadItem = async (itemKey: string) => {
      const value = rpcProvider.rpc("read-state", itemKey as keyof State);
      if (value === undefined) {
        return new DefaultValue();
      }
      return value;
    };
    const writer: WriteItems = async ({ diff }) => {
      console.log("[webview] writing items: ", diff.keys());
      const entries = [...diff];
      const values = Object.fromEntries(entries);
      return rpcProvider.rpc("write-state", values);
    };

    // Note there is no unregister here
    const listen: ListenToItems = ({ updateItems }) => {
      rpcProvider.registerRpcHandler<Record<string, any>, any>(
        "update-state",
        (values) => {
          updateItems(new Map(Object.entries(values)));
        }
      );
    };
    return { reader, writer, listen };
  }, [rpcProvider]);
}
