import React, { FC, PropsWithChildren, useMemo } from "react";
import { ListenToItems, ReadItem, RecoilSync, WriteItems } from "recoil-sync";
import { RpcProvider } from "worker-rpc";
import { useExtensionState } from "./ExtensionState";

export const RecoilSyncWebview: FC<PropsWithChildren<{}>> = ({ children }) => {
  const { rpcProvider } = useExtensionState();

  const { reader, writer, listen } = useRpc(rpcProvider);
  return (
    <RecoilSync read={reader} write={writer} listen={listen}>
      {children}
    </RecoilSync>
  );
};

function useRpc(rpcProvider: RpcProvider | undefined): {
  reader: ReadItem;
  writer: WriteItems;
  listen: ListenToItems;
} {
  return useMemo(() => {
    const reader: ReadItem = async (itemKey) => {
      return rpcProvider?.rpc("read-state", itemKey);
    };
    const writer: WriteItems = async ({ allItems }) => {
      const entries = [...allItems];
      const values = Object.fromEntries(entries);
      return rpcProvider?.rpc("write-state", values);
    };

    // Note there is no unregister here
    const listen: ListenToItems = ({ updateItems }) => {
      rpcProvider?.registerRpcHandler<Record<string, any>, any>(
        "update-state",
        (values) => {
          updateItems(new Map(Object.entries(values)));
        }
      );
    };
    return { reader, writer, listen };
  }, [rpcProvider]);
}
