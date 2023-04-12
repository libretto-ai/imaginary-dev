import { JSONSchema7 } from "json-schema";
import ts from "typescript";
export function tsNodeToJsonSchema(
  node: ts.Node,
  sourceFile: ts.SourceFile
): JSONSchema7 {
  console.log("converting ", node, node?.kind);
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
      // hack, passthrought function declaration
      if (ts.isFunctionDeclaration(node)) {
        if (!node.type) {
          throw new Error("No return type");
        }
        return tsNodeToJsonSchema(node.type, sourceFile);
      }
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
