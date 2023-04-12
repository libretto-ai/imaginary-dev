import { JSONSchema7 } from "json-schema";
import ts from "typescript";

/**
 * Convert a pure Typescript AST representing a type node into JSONSchema for
 * that type. This is somewhat of a cheap substitute for `tsTypeToJsonSchema`:
 * it doesn't fully resolve types but it also doesn't require a typechecker.
 *
 * @param node A TypeNode or raw Node
 * @param sourceFile The source file for the AST (to get names of identifiers)
 * @param promisePassThrough If the node is a Promise, should this return the
 *     type that the Promise resolves to? Note that this is not passed through
 *     recursively, so it only works on the node that is passed in.
 * @returns a JSON Schema object
 */
export function tsNodeToJsonSchema(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  promisePassThrough = false
): JSONSchema7 {
  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { type: "string" };
    case ts.SyntaxKind.BooleanKeyword:
      return { type: "boolean" };
    case ts.SyntaxKind.NumberKeyword:
      return { type: "number" };
    case ts.SyntaxKind.NullKeyword:
      return { type: "null" };
    case ts.SyntaxKind.UnionType:
    default:
      if (ts.isTypeLiteralNode(node)) {
        return {
          type: "object",
          properties: Object.fromEntries(
            node.members.map((member) => {
              if (ts.isPropertySignature(member) && member.type) {
                return [
                  member.name?.getText(sourceFile),
                  tsNodeToJsonSchema(member.type, sourceFile),
                ];
              }
              throw new Error("Type literal has bad signature");
            })
          ),
        };
      }
      if (ts.isArrayTypeNode(node)) {
        return {
          type: "array",
          items: tsNodeToJsonSchema(node.elementType, sourceFile),
        };
      }
      if (ts.isUnionTypeNode(node)) {
        return {
          anyOf: node.types.map((type) => tsNodeToJsonSchema(type, sourceFile)),
        };
      }
      if (ts.isArrayTypeNode(node)) {
        return {
          type: "array",
          items: tsNodeToJsonSchema(node.elementType, sourceFile),
        };
      }
      if (ts.isParenthesizedTypeNode(node)) {
        return tsNodeToJsonSchema(node.type, sourceFile);
      }
      if (ts.isTypeReferenceNode(node)) {
        if (ts.isIdentifier(node.typeName)) {
          // Hack, turn Promise into passthrough for the type
          if (node.typeName.text === "Promise") {
            if (!promisePassThrough) {
              throw new Error("Cannot convert Promise-based types");
            }
            const returnType = node.typeArguments?.[0];
            if (!returnType) {
              throw new Error("Promise missing return type");
            }
            return tsNodeToJsonSchema(returnType, sourceFile);
          }
          if (node.typeName.text === "Record") {
            const [keyType, valueType] = node.typeArguments ?? [];
            if (
              !keyType ||
              tsNodeToJsonSchema(keyType, sourceFile).type !== "string"
            ) {
              throw new Error(`Records must have string key types`);
            }
            return {
              type: "object",
              additionalProperties: tsNodeToJsonSchema(valueType, sourceFile),
            };
          }
          return { type: node.typeName.text as JSONSchema7["type"] };
        }
        throw new Error(`Cannot handle qualified names`);
      }
      throw new Error(`Unknown type: ${node.kind}`);
  }
}
