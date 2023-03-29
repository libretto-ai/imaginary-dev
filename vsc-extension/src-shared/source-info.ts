import * as ts from "typescript";

export interface SourceFileInfo {
  sourceFile: ts.SourceFile;
  functions: ts.FunctionDeclaration[];
}
export type SourceFileMap = Record<string, SourceFileInfo>;

interface SerializableFunctionDeclaration {
  name?: string;
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

export function makeSerializable(
  sources: SourceFileMap
): SerializableSourceFileMap {
  const resultList = Object.entries(sources).map(
    ([key, sourceFileInfo]): [string, SerializableSourceFileInfo] => {
      const { fileName } = sourceFileInfo.sourceFile;
      return [
        key,
        {
          sourceFile: {
            fileName,
          },
          functions: sourceFileInfo.functions.map(
            (fn): SerializableFunctionDeclaration => {
              const { name } = fn;
              return { name: name?.text };
            }
          ),
        },
      ];
    }
  );
  return Object.fromEntries(resultList);
}
