import {
  MaybeSelectedFunction,
  SerializableSourceFileMap,
  SourceFileTestCaseMap,
} from "../../src-shared/source-info";

export interface State {
  sources: SerializableSourceFileMap;
  selectedFunction: MaybeSelectedFunction;
  "app.debugMode": boolean;
  testCases: SourceFileTestCaseMap;
}
