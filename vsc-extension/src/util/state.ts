import {
  MaybeSelectedFunction,
  SourceFileMap,
  SourceFileTestCaseMap,
} from "../../src-shared/source-info";

export interface State {
  sources: SourceFileMap;
  selectedFunction: MaybeSelectedFunction;
  "app.debugMode": boolean;
  testCases: SourceFileTestCaseMap;
}
