import template from "@babel/template";
import * as t from "@babel/types";
import {
  extractServiceParameters,
  ImaginaryFunctionDefinition,
  isImaginaryCommentBlock,
  makeTSDocParser,
} from "@imaginary-dev/util";
import { JSONSchema7 } from "json-schema";
import { UnreachableCaseError } from "ts-essentials";
import { babelTypeToJsonSchema } from "./babelTypeToJsonSchema";

/**
 * Generate the AST to call callImaginaryFunction. Need to uniquely generate
 * the default imports so that we can redundantly import this module.
 *
 * @param arg.funcName - {string} the original name of the function
 * @param arg.parameterNames - {Identifier[]} the function argument names
 * @param arg.parameters - {ObjectExpression} the arg names as as a shorthand
 *   object expression, e.g. `{a, b, c}`
 * @param arg.funcComment - {StringLiteral} the imaginary function comment
 * @param arg.paramDefinitions - {ObjectExpression} the parameter names and optional TypeScript types expressed as strings
 * @param arg.returnSchema - {ObjectExpression} the imaginary function return type, expressed as a JSON Schema
 */
const generateCallAst = template.statements(
  `
    import * as %%runPromptName%% from "@imaginary-dev/runtime";
    // TODO: deal with non-string responses
    export async function %%funcName%%(%%parameterNames%%) {
        return %%runPromptName%%.callImaginaryFunction(%%funcComment%%, %%funcNameString%%, %%paramDefinitions%%, %%returnSchema%%, %%parameters%%)
    }
`,
  { syntacticPlaceholders: true }
);

interface MakeCallParams extends ImaginaryFunctionDefinition {
  uniqueId?: string;
}
/**
 * Generates the full function implementation for an imaginary function, which
 * mostly just calls through to callImaginaryFunction
 */
function generateFunctionBodyAst({
  funcComment,
  funcName,
  parameterTypes,
  uniqueId,
  returnSchema,
}: MakeCallParams) {
  const parameterNames = parameterTypes.map((param) =>
    t.identifier(param.name)
  );
  const parameterArgs = t.objectExpression(
    parameterTypes.map((param) =>
      t.objectProperty(
        t.identifier(param.name),
        t.identifier(param.name),
        false,
        true
      )
    )
  );
  const paramDefinitions = t.arrayExpression(
    parameterTypes.map(({ name, type }) => {
      return t.objectExpression([
        t.objectProperty(
          t.identifier("name"),
          t.stringLiteral(name),
          false,
          false
        ),
        t.objectProperty(
          t.identifier("type"),
          objectToAst(type ?? {}),
          false,
          false
        ),
      ]);
    })
  );
  const uniqueValue = uniqueId ?? `${Math.floor(Math.random() * 10000)}`;
  const statements = generateCallAst({
    funcComment: t.stringLiteral(funcComment),
    funcName,
    funcNameString: t.stringLiteral(funcName),
    parameterNames,
    paramDefinitions,
    parameters: parameterArgs,
    runPromptName: t.identifier(`__runPrompt$${uniqueValue}`),
    returnSchema: returnSchema ? objectToAst(returnSchema) : null,
  });
  return statements;
}
export function handleDeclaration(
  prefix: string,
  node: t.ExportDeclaration | t.TSDeclareFunction | t.FunctionDeclaration,
  comments: t.Comment[] | undefined | null,
  uniqueId?: string
) {
  const imaginaryFunctionDefinition = getImaginaryFunctionDefinition(
    prefix,
    comments,
    node,
    false
  );
  if (imaginaryFunctionDefinition === null) return null;

  const newFunctionBody = expandFunctionBody(
    imaginaryFunctionDefinition,
    uniqueId
  );
  return newFunctionBody;
}

function getTSDeclarationFromNode<
  T extends t.ExportNamedDeclaration | t.TSDeclareFunction
>(node: T) {
  if (
    node.type === "ExportNamedDeclaration" &&
    node.declaration?.type === "TSDeclareFunction"
  ) {
    return node.declaration;
  } else if (node.type === "TSDeclareFunction") {
    return node as t.TSDeclareFunction;
  }
  throw new Error("Internal error in getTSDeclarationFromNode");
}

export function getImaginaryFunctionDefinition(
  prefix: string,
  comments: t.Comment[] | undefined | null,
  node: t.FunctionDeclaration | t.TSDeclareFunction | t.ExportDeclaration,
  includeNonImaginaryFunctions: boolean
): ImaginaryFunctionDefinition | null {
  // because Array.findLast is still not quite available in TypeScript!
  const reversedComments = Array.from(comments ?? []).reverse();
  const parser = makeTSDocParser();
  const imaginaryCommentBlocks = reversedComments.filter((comment) => {
    const parserContext = parser.parseString(`/*${comment.value}*/`);

    return isImaginaryCommentBlock(parserContext);
  });
  if (!imaginaryCommentBlocks.length && !includeNonImaginaryFunctions) {
    return null;
  }

  if (imaginaryCommentBlocks.length > 1) {
    throw new Error(
      "imaginary functions should only have one @imaginary TsDoc comment"
    );
  }
  const leadingCommentBlock = imaginaryCommentBlocks[0] ?? reversedComments[0];

  if (
    (node.type === "ExportNamedDeclaration" &&
      node.declaration?.type === "TSDeclareFunction") ||
    node.type === "TSDeclareFunction"
  ) {
    const declaration = getTSDeclarationFromNode(node);
    if (declaration.typeParameters) {
      const typeParameterNames =
        declaration.typeParameters.type === "TSTypeParameterDeclaration"
          ? declaration.typeParameters.params.map(
              (typeParameter) => typeParameter.name
            )
          : [];
      throw new Error(
        `Functions cannot include type variables. (${typeParameterNames.join(
          ", "
        )})`
      );
    }
    const funcName = declaration.id?.name;
    if (!funcName) {
      throw new Error("Imaginary functions need names");
    }
    if (declaration.returnType && !isPromise(declaration)) {
      throw new Error(
        `Imaginary function compilation error: all imaginary functions must have a return type of Promise<T>`
      );
    }

    // Only use the single related comment (babel provides all leading and trailing comments by default)
    const newSignatureNode = t.cloneNode(node);
    newSignatureNode.trailingComments = [];
    newSignatureNode.leadingComments = [leadingCommentBlock];
    const returnType = awaited(declaration.returnType);
    const returnSchema = returnType ? babelTypeToJsonSchema(returnType) : null;

    const funcComment = leadingCommentBlock
      ? "/*" + leadingCommentBlock.value + "*/"
      : "";
    const serviceParameters = extractServiceParameters(parser, funcComment);
    return {
      funcComment: funcComment,
      funcName,
      parameterTypes: getParameterTypes(declaration),
      returnSchema,
      isImaginary: imaginaryCommentBlocks.length > 0,
      serviceParameters,
    };
  }

  console.warn(prefix, "Unknown ExportDeclaration: ", node.type);

  return null;
}

function getParameterTypes(
  declaration: t.TSDeclareFunction
): { name: string; type?: JSONSchema7 | undefined }[] {
  const parameterTypes = declaration.params.map((p, i) => {
    switch (p.type) {
      case "RestElement":
      case "ArrayPattern":
      case "ObjectPattern":
      case "AssignmentPattern":
        throw Error(
          `Parameter ${i + 1} of type ${
            p.type
          } is not a valid parameter. All parameters must be named.`
        );
      default:
        return {
          name: (p as t.Identifier).name,
          type:
            p.typeAnnotation?.type === "TSTypeAnnotation"
              ? babelTypeToJsonSchema(p.typeAnnotation.typeAnnotation)
              : undefined,
        };
    }
  });
  const parameterCounts = parameterTypes
    .map(({ name }) => name)
    .reduce<Record<string, number>>(
      (counts, name) => ({
        ...counts,
        [name]: (counts[name] ?? 0) + 1,
      }),
      {}
    );
  const duplicateNames = Object.entries(parameterCounts)
    .filter(([name, count]) => count > 1)
    .map(([name]) => `"${name}"`);
  if (duplicateNames.length) {
    throw new Error(
      `Duplicate parameter names found: ${duplicateNames.join(", ")}`
    );
  }
  return parameterTypes;
}

function expandFunctionBody(
  imaginaryFunctionDefinition: ImaginaryFunctionDefinition,
  uniqueId?: string
): t.Statement[] {
  const newFunctionBody = generateFunctionBodyAst(
    Object.assign(imaginaryFunctionDefinition, { uniqueId })
  );
  return newFunctionBody;
}
function isPromise(declaration: t.TSDeclareFunction) {
  // TODO: This is not making sure that this is a "real" / build-in Promise,
  // maybe that is ok?
  return (
    declaration.returnType?.type === "TSTypeAnnotation" &&
    declaration.returnType.typeAnnotation.type === "TSTypeReference" &&
    declaration.returnType.typeAnnotation.typeName.type === "Identifier" &&
    declaration.returnType.typeAnnotation.typeName.name === "Promise" &&
    declaration.returnType.typeAnnotation.typeParameters?.params.length === 1
  );
}

function awaited(tsType?: t.TSTypeAnnotation | t.Noop | null) {
  if (!tsType || tsType.type === "Noop") {
    return null;
  }

  if (
    tsType.typeAnnotation.type !== "TSTypeReference" ||
    tsType.typeAnnotation.typeName.type !== "Identifier" ||
    tsType.typeAnnotation.typeName.name !== "Promise"
  ) {
    return null;
  }
  const awaitedType = tsType.typeAnnotation.typeParameters?.params[0];
  return awaitedType;
}

/**
 * Quick hack to resolve live JS objects into babel ASTs, doesn't seem to be an
 * easy way to do this with babel directly?
 */
function objectToAst<
  V,
  T extends string | number | Record<string, V> | boolean | JSONSchema7 | any[]
>(obj: T) {
  switch (typeof obj) {
    case "bigint":
      throw new Error("BigInt not supported");
    case "symbol":
      throw new Error("Symbol not supported");
    case "function":
      throw new Error("Function not supported");
    case "boolean":
      return t.booleanLiteral(obj);
    case "number":
      return t.numericLiteral(obj);
    case "string":
      return t.stringLiteral(obj);
    case "undefined":
      return t.unaryExpression("void", t.numericLiteral(0), true);
    case "object":
      if (Array.isArray(obj)) {
        return t.arrayExpression(obj.map(objectToAst));
      }
      if (obj === null) {
        return t.nullLiteral();
      }
      return t.objectExpression(
        Object.entries(obj).map(([k, v]) =>
          t.objectProperty(t.stringLiteral(k), objectToAst(v))
        )
      );
    default:
      throw new UnreachableCaseError(obj);
  }
}
