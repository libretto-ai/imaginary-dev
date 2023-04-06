import { RpcProvider } from "worker-rpc";

export interface RpcMessage {
  id: "rpc";
  params: [message: RpcProvider.Message, transfer?: any[]];
}

export type ImaginaryMessage = RpcMessage;
