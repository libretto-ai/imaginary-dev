import { JSONSchema7, JSONSchema7TypeName } from "json-schema";

/**
 * Normalize a JSON schema into a basic type, by inspecting things like enum, anyOf, etc
 * @param type
 * @returns
 */
export function getJSONSchemaType(type: JSONSchema7): JSONSchema7TypeName {
  if (typeof type.type === "string") {
    return type.type;
  }
  if (type.const) {
    const constType = typeof type.const;
    switch (constType) {
      case "string":
      case "number":
      case "boolean":
        return constType;
      default:
        throw new Error(
          `Cannot generate prompt prefix for const value ${constType}`
        );
    }
  }
  if (type.anyOf?.length) {
    const allPrefixes = type.anyOf
      .map((schema) =>
        typeof schema === "boolean" ? null : getJSONSchemaType(schema)
      )
      .filter((prefix): prefix is JSONSchema7TypeName => !!prefix);
    const uniquePrefixes = new Set(allPrefixes);
    if (uniquePrefixes.size === 1) {
      return Array.from(uniquePrefixes)[0];
    }
    throw new Error(
      "Cannot generate prompt prefix for heterogeneous anyOf types"
    );
  }
  if (type.enum?.length) {
    const types = new Set(type.enum.map((e) => typeof e));
    if (types.size !== 1) {
      throw new Error("Cannot handle heterogeneous enums");
    }
    if (types.size === 1) {
      const enumType = Array.from(types)[0];
      switch (enumType) {
        case "string":
        case "number":
        case "boolean":
          return enumType;
        default:
          throw new Error(
            `Cannot determine JSONSchema for enum of type ${enumType}`
          );
      }
    }
    throw new Error(
      `Cannot determine general JSONSchema for heterogenous enum`
    );
  }
  throw new Error(`Cannot determine general JSONSchema`);
}
