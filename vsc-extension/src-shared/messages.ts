import { RpcProvider } from "worker-rpc";
import {
  MaybeSelectedFunction,
  SerializableSourceFileMap,
  SourceFileTestCaseMap,
} from "./source-info";

export interface UpdateSourcesMessage {
  id: "update-sources";
  params: [Readonly<SerializableSourceFileMap>];
}

export interface UpdateFunctionSelectionMessage {
  id: "update-function-selection";
  params: [MaybeSelectedFunction];
}

export interface UpdateTestCasesMessage {
  id: "update-testcases";
  params: [SourceFileTestCaseMap];
}

export interface RpcMessage {
  id: "rpc";
  params: [message: RpcProvider.Message, transfer?: any[]];
}

export interface UpdateFunctionTestCases {
  id: "update-selected-test-cases";
  params: [SourceFileTestCaseMap];
}

export type ImaginaryMessage =
  | UpdateFunctionSelectionMessage
  | UpdateSourcesMessage
  | UpdateTestCasesMessage
  | UpdateFunctionTestCases
  | RpcMessage;
