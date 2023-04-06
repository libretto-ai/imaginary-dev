import { RpcProvider } from "worker-rpc";
import { SerializableSourceFileMap } from "./source-info";

export interface UpdateSourcesMessage {
  id: "update-sources";
  params: [Readonly<SerializableSourceFileMap>];
}

export interface RpcMessage {
  id: "rpc";
  params: [message: RpcProvider.Message, transfer?: any[]];
}

export type ImaginaryMessage = UpdateSourcesMessage | RpcMessage;
