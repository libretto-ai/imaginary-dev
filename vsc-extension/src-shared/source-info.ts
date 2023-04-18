import { ServiceParameters } from "@imaginary-dev/util";
import { JSONSchema7 } from "json-schema";

export interface FunctionTestCase {
  /** Map of parameter name => value */
  name: string;
  /** Set if the user manually sets the name */
  hasCustomName?: boolean;
  inputs: Record<string, any>;

  serviceParameters?: ServiceParameters;
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

/** TODO: replace with JSONSchema */
export interface ParameterDescriptor {
  name: string;
  schema?: JSONSchema7;
}

export interface SerializableFunctionDeclaration {
  name?: string;
  declaration: string;
  parameters: ParameterDescriptor[];
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

export function findMatchingFunction(
  sources: SerializableSourceFileMap,
  selectedFunction: MaybeSelectedFunction
) {
  if (!selectedFunction) {
    return undefined;
  }
  const matchingSource = Object.values(sources).find(
    (source) => source.sourceFile.fileName === selectedFunction.fileName
  );
  if (!matchingSource) {
    return undefined;
  }
  const matchingFunction = matchingSource.functions.find(
    (fn) => fn.name === selectedFunction.functionName
  );
  return matchingFunction;
}

export type SourceFileTestOutputMap = Record<string, SourceFileTestOutput>;

/** Test outputs for all functions in a file */
export interface SourceFileTestOutput {
  sourceFileName: string;
  functionOutputs: FunctionTestOutput[];
}

/** Test outputs for a function */
export interface FunctionTestOutput {
  functionName: string;
  outputs: TestOutput[];
}

/** Test output results and metadata */
export interface TestOutput {
  output: any;
  /** ISO8601 date? */
  lastRun: string;
}
