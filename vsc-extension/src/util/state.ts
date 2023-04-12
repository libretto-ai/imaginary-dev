import {
  MaybeSelectedFunction,
  SelectedFileTestCases,
  SerializableSourceFileMap,
  SourceFileTestCaseMap,
} from "../../src-shared/source-info";

export interface State {
  /** Contains all imaginary functions in the form
   * fileName -> functionName -> SerializableFunctionDeclaration
   */
  sources: SerializableSourceFileMap;
  /**
   * Contains the currently "selected" function - meaning the cursor is over the
   * function and/or the user has selected it via other affordances
   */
  selectedFunction: MaybeSelectedFunction;

  /** Internal debug flag */
  "app.debugMode": boolean;

  /** Contains the test cases for a function, in the form
   *
   * fileName -> functionName -> FunctionTestCase[]
   */
  testCases: SourceFileTestCaseMap;

  /**
   * Records the index of the "selected" test case for a given function in the form.
   *
   * fileName -> functionName -> { selectedIndex: 1 }
   *
   * This allows each fileName/functionName combination to have its own selected state.
   */
  selectedTestCases: SelectedFileTestCases;
}
