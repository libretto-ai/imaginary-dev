import {
  MaybeSelectedFunction,
  SerializableSourceFileMap,
  SourceFileTestCases,
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
  params: [SourceFileTestCases[]];
}

export type ImaginaryMessage =
  | UpdateFunctionSelectionMessage
  | UpdateSourcesMessage
  | UpdateTestCasesMessage;
