import * as ts from "typescript";

export interface FunctionTestCase {
  /** Map of parameter name => value */
  name: string;
  inputs: Record<string, any>;
  /**
   * The outputs from running the function with these inputs
   * TODO: move these elsewhere?
   **/
  output: {
    // corresponds to the current output on HEAD
    prev: any;
    current: any;
  };
}

/** Wrapper for all test cases for a given function */
export interface FunctionTestCases {
  functionName: string;
  testCases: FunctionTestCase[];
}

/** Wrapper for all test cases in a given file */
export interface SourceFileTestCases {
  sourceFileName: string;
  functionTestCases: FunctionTestCases[];
}

/** Map of filename => test for that filename */
export type SourceFileTestCaseMap = Record<string, SourceFileTestCases>;

export interface SourceFileInfo {
  sourceFile: ts.SourceFile;
  functions: ts.FunctionDeclaration[];
}
export type SourceFileMap = Record<string, SourceFileInfo>;

export interface SerializableFunctionDeclaration {
  name?: string;
  declaration: string;
  parameters: {
    name: string;

    /** Quick hack for POC of parameters */
    tempType: "number" | "string" | "object" | "array" | string;
  }[];
}

interface SerializableSourceFile {
  fileName: string;
}

export interface SerializableSourceFileInfo {
  sourceFile: SerializableSourceFile;
  functions: SerializableFunctionDeclaration[];
}

export type SerializableSourceFileMap = Record<
  string,
  SerializableSourceFileInfo
>;

/** Currently selected function */
export interface SelectedFunction {
  fileName: string;
  functionName: string;
}

export type MaybeSelectedFunction = SelectedFunction | null;

interface SelectedTestCase {
  /** Doing this by index for now, but maybe we need test case ids or something */
  testCaseIndex: number;
}

export type MaybeSelectedTestCase = SelectedTestCase | null;

export type SelectedFunctionTestCases = Record<string, MaybeSelectedTestCase>;

/** Map of filename -> functionName -> selected test index */
export type SelectedFileTestCases = Record<string, SelectedFunctionTestCases>;
