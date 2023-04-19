import { RpcProviderInterface } from "worker-rpc";
import { type ExtensionRpcInterface } from "../src/rpc-handlers";
import { State } from "../src/util/state";
import { type RpcCaller } from "../src/util/types";

type StateRpcProvider<S> = {
  "read-state": (itemKey: keyof S) => Promise<void>;
  "write-state": (value: Partial<S>) => Promise<void>;
};
/** Adds strong typing to the RpcProviderInterface, specifically `rpc("id", {params})` */
export type ExtensionRpcProvider = Omit<RpcProviderInterface, "rpc"> &
  RpcCaller<ExtensionRpcInterface & StateRpcProvider<State>>;
