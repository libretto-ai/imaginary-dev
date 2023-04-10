import ts from "typescript";
import {
  SerializableFunctionDeclaration,
  SerializableSourceFileInfo,
  SerializableSourceFileMap,
} from "../../src-shared/source-info";
import { SourceFileInfo, SourceFileMap } from "./ts-source";

/** Converts from native TS types to something that can be sent through a
 * message, i.e. serialized as JSON */
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
