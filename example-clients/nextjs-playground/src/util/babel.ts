"use client";
import { parse as parseCode } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import * as transformer from "@imaginary-dev/babel-transformer";
import { playgroundParser } from "@imaginary-dev/babel-transformer";
import { ImaginaryFunctionDefinition } from "@imaginary-dev/util";
import { JSONSchema7 } from "json-schema";

export interface ParsedDeclaration {
  declaration:
    | t.TSDeclareFunction
    | t.FunctionDeclaration
    | t.ExportDeclaration;
  comments?: t.Comment[] | null;
}
export function getDeclarations(code: string) {
  const ast = parseCode(code, {
    sourceType: "module",
    plugins: ["typescript"],
    attachComment: true,
  });
  const declarations: ParsedDeclaration[] = [];
  traverse(ast, {
    TSDeclareFunction(path) {
      const comments = transformer.getCommentsForPath(path);
      const declaration = path.node;
      declarations.push({ comments, declaration });
    },
    FunctionDeclaration(path) {
      const comments = transformer.getCommentsForPath(path);
      const declaration = path.node;
      declarations.push({ comments, declaration });
    },
    // ExportDeclaration(path) {
    //   const comments = tt.getCommentsForPath(path);
    //   const declaration = path.node;
    //   declarations.push({ comments, declaration });
    // },
    ExportNamedDeclaration(path) {},
  });

  return declarations;
}

export type JSONSchemaOrUntyped =
  | (JSONSchema7 & {
      name?: string;
    })
  | null;

enum ErrorType {
  NO_TSDOC,
  NO_IMAGINARY_TAG,
  NO_DEFINITIONS,
  TOO_MANY_DEFINITIONS,
  NO_FUNCTION_NAME,
  NO_ARGUMENTS,
  NO_RETURN_VALUE,
  NO_PROMISE_IN_RETURN,
  PARSE_ERROR,
  UNKNOWN_TYPE,
}

class SyntaxError extends Error {
  errorCode: ErrorType;
  constructor(message: string, code: ErrorType) {
    super(message);
    this.errorCode = code;
  }
}

export function getJSONParameterSchemas(code: string): JSONSchemaOrUntyped[] {
  const declarations = getDeclarations(code);
  if (!declarations?.length) {
    throw new SyntaxError("No definitions found", ErrorType.NO_DEFINITIONS);
    return [];
  }
  if (declarations.length > 1) {
    throw new SyntaxError(
      "Found more than one function declaration",
      ErrorType.TOO_MANY_DEFINITIONS
    );
  }
  const { declaration } = declarations[0];
  switch (declaration.type) {
    case "TSDeclareFunction": {
      return declaration.params
        .map((param) => {
          if (param.typeAnnotation?.type === "TSTypeAnnotation") {
            try {
              const newType = transformer.babelTypeToJsonSchema(
                param.typeAnnotation.typeAnnotation
              );
              if (param.type === "Identifier") {
                // "title" is the JSONSchema convention, though there is no
                // enforcement
                newType.title = param.name;
                // We invent this one
                (newType as Record<string, any>).is_required = !param.optional;
              }
              return newType;
            } catch (ex) {
              throw new SyntaxError(`${ex}`, ErrorType.PARSE_ERROR);
            }
          }
          if (param.type === "Identifier") {
            return { name: param.name };
          }
          if (!param.typeAnnotation?.type) {
            throw new SyntaxError(`No type annotation?`, ErrorType.PARSE_ERROR);
          }
          throw new SyntaxError(
            `Parameter type cannot be determined from {param.typeAnnotation?.type ?? "??"}`,
            ErrorType.UNKNOWN_TYPE
          );
        })
        .filter((s): s is JSONSchema7 => !!s);
    }
    default:
      throw new SyntaxError(
        `Unhandled declaration type: ${declaration.type}`,
        ErrorType.PARSE_ERROR
      );
  }
}

export function getImaginaryFunctionDefinitions(
  code: string,
  includeNonImaginaryFunctions: boolean = false
): ImaginaryFunctionDefinition[] {
  const imaginaryFunctionDefinitions: ImaginaryFunctionDefinition[] = [];

  try {
    const ast = parseCode(code, {
      sourceType: "module",
      plugins: ["typescript"],
      attachComment: true,
    });

    const visitor = playgroundParser(
      imaginaryFunctionDefinitions,
      includeNonImaginaryFunctions
    );
    traverse(ast, visitor);
  } catch (e) {
    throw new SyntaxError(
      (e as Error).message ?? `${e}`,
      ErrorType.PARSE_ERROR
    );
  }
  return imaginaryFunctionDefinitions;
}
