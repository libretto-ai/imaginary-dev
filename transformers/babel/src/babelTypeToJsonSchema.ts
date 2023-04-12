import * as t from "@babel/types";
import { JSONSchema7 } from "json-schema";

/** Convert babel types to a JSONSchema object that can be validated */
export function babelTypeToJsonSchema<T = any>(tsType: t.TSType): JSONSchema7 {
  if (!tsType) {
    throw new Error("Unset type");
  }
  switch (tsType.type) {
    case "TSAnyKeyword": {
      return {
        type: ["object", "string", "number", "boolean", "null", "array"],
      };
    }
    case "TSArrayType": {
      return {
        type: "array",
        items: babelTypeToJsonSchema(tsType.elementType),
      };
    }
    case "TSLiteralType": {
      if (tsType.literal.type === "UnaryExpression") {
        throw new Error("Unhandled unary");
      }
      if (tsType.literal.type === "TemplateLiteral") {
        throw new Error("Unhandled template");
      }
      // need to call these out individually to make type resolution to
      // JSONSchemaType work
      if (tsType.literal.type === "StringLiteral") {
        return { const: tsType.literal.value };
      }
      if (tsType.literal.type === "BooleanLiteral") {
        return { const: tsType.literal.value };
      }
      if (tsType.literal.type === "NumericLiteral") {
        return { const: tsType.literal.value };
      }
      throw new Error(`Unhandled literal type ${tsType.literal.type}`);
    }
    case "TSBooleanKeyword":
      return { type: "boolean" };
    case "TSNumberKeyword":
      return { type: "number" };
    case "TSStringKeyword":
      return { type: "string" };
    case "TSNullKeyword": {
      return { type: "null" };
    }
    case "TSUnionType": {
      // TODO: order the anyOf by some predictable key
      return {
        anyOf: tsType.types.map(babelTypeToJsonSchema),
      };
    }
    case "TSIntersectionType": {
      throw new Error(`we do not yet support intersection types.`);
    }
    case "TSTypeLiteral": {
      const requiredPropNames = tsType.members
        .filter((tsType): tsType is t.TSPropertySignature => {
          if (tsType.type === "TSPropertySignature") {
            return !tsType.optional;
          }
          throw new Error(`Unexpected Property signature type ${tsType.type}`);
        })
        .map((tsType) => extractKey(tsType.key));
      const properties = Object.fromEntries(
        tsType.members.map((member): [string, JSONSchema7] => {
          if (member.type === "TSPropertySignature") {
            if (!member.typeAnnotation) {
              throw new Error("Missing type annotation for property signature");
            }
            const key = extractKey(member.key);
            return [
              key,
              babelTypeToJsonSchema(member.typeAnnotation.typeAnnotation),
            ];
          }
          if (member.type === "TSIndexSignature") {
            throw new Error("Index signatures not yet supported");
          }
          throw new Error(`Unexpected Property signature type: ${member.type}`);
        })
      );
      const jsonSchema: JSONSchema7 = {
        type: "object",
        properties: properties,
      };
      if (requiredPropNames.length) {
        jsonSchema.required = requiredPropNames;
      }
      return jsonSchema;
    }
    case "TSTupleType": {
      throw new Error(
        "Typed arrays not supported yet. (Did you mean <type>[] instead of [<type>]?"
      );
    }
    case "TSParenthesizedType": {
      return babelTypeToJsonSchema(tsType.typeAnnotation);
    }
    case "TSTypeReference": {
      if (tsType.typeName.type === "Identifier") {
        const arrayType = tsType.typeParameters?.params[0];
        if (tsType.typeName.name === "Array" && arrayType) {
          return {
            type: "array",
            items: babelTypeToJsonSchema(arrayType),
          };
        }
        if (
          tsType.typeName.name === "Record"
          // TODO: enable when Map rehydration is ready
          // || tsType.typeName.name === "Map" */
        ) {
          const [keyType, valueType] = tsType.typeParameters?.params ?? [];
          const typeName = tsType.typeName.name;
          if (!keyType || !valueType) {
            throw new Error(
              `Missing key or value paramter for ${typeName} type.`
            );
          }
          if (keyType.type !== "TSStringKeyword") {
            throw new Error(`${typeName} key type must be 'string'`);
          }

          return {
            type: "object",
            // __prompt_js_type: tsType.typeName.name,
            additionalProperties: babelTypeToJsonSchema(valueType),
          };
        }
        throw new Error(
          `User-defined types must be inlined: "${tsType.typeName.name}"`
        );
      }

      throw new Error(
        `Unhandled TSTypeReference reference (${tsType.typeName.type})`
      );
    }
    case "TSFunctionType":
      throw new Error(
        "Imaginary function error: return values from imaginary functions must be JSON-serializable and cannot have function properties."
      );
    default:
      // if you would add another option to DummyOptions, you'll get error here!
      throw new Error(`Unhandled type "${tsType.type}"`);
  }
}

function extractKey(e: t.Expression) {
  switch (e.type) {
    case "StringLiteral":
      return e.value;
    case "Identifier":
      return e.name;
    default:
      throw new Error(`Unexpected property key of type: ${e.type}`);
  }
}
