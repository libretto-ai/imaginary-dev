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

export interface SelectedFunction {
  fileName: string;
  functionName: string;
}

export type MaybeSelectedFunction = SelectedFunction | null;

export type SelectedFunctionTestCase = Record<
  string,
  {
    testCaseIndex: number;
  }
>;

export type SelectedFileTestCase = Record<string, SelectedFunctionTestCase>;

export function makeSerializable(
  sources: SourceFileMap
): SerializableSourceFileMap {
  const printer = ts.createPrinter({ removeComments: true });
  const resultList = Object.entries(sources).map(
    ([key, sourceFileInfo]): [string, SerializableSourceFileInfo] => [
      key,
      makeSerializableSourceFile(sourceFileInfo, printer),
    ]
  );
  return Object.fromEntries(resultList);
}

function makeSerializableSourceFile(
  sourceFileInfo: SourceFileInfo,
  printer: ts.Printer
): SerializableSourceFileInfo {
  const { fileName } = sourceFileInfo.sourceFile;

  return {
    sourceFile: {
      fileName,
    },
    functions: sourceFileInfo.functions.map((fn) =>
      makeSerialiableFunction(fn, sourceFileInfo, printer)
    ),
  };
}

function makeSerialiableFunction(
  fn: ts.FunctionDeclaration,
  sourceFileInfo: SourceFileInfo,
  printer: ts.Printer
): SerializableFunctionDeclaration {
  const { name } = fn;
  return {
    name: name?.text,
    declaration: printer.printNode(
      ts.EmitHint.Unspecified,
      fn,
      sourceFileInfo.sourceFile
    ),
    parameters: fn.parameters.map((param) => {
      return {
        name:
          param.name.kind === ts.SyntaxKind.Identifier
            ? param.name.escapedText.toString()
            : "<unknown>",
        tempType: param.type
          ? (printer.printNode(
              ts.EmitHint.Unspecified,
              param.type,
              sourceFileInfo.sourceFile
            ) as any)
          : "object",
      };
    }),
  };
}
