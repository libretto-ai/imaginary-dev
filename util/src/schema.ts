import { JSONSchema7 } from "json-schema";

export const jsonSchemaToTypeScriptText = (jsonSchema: JSONSchema7): string => {
  // simple literal types
  if (
    jsonSchema.const === null ||
    typeof jsonSchema.const === "string" ||
    typeof jsonSchema.const === "number" ||
    typeof jsonSchema.const === "boolean"
  ) {
    return jsonSchemaConstToTypeScriptText(jsonSchema.const);
  }

  if (jsonSchema.type === "null") {
    return "null";
  }

  // enum/union types
  if (jsonSchema.anyOf) {
    return (
      "( " + jsonSchema.anyOf.map(jsonSchemaToTypeScriptText).join(" | ") + " )"
    );
  }

  if (jsonSchema.enum) {
    return (
      "( " +
      jsonSchema.enum.map(jsonSchemaConstToTypeScriptText).join(" | ") +
      " )"
    );
  }

  // primitive types all just are themselves in TypeScript
  if (
    jsonSchema.type === "string" ||
    jsonSchema.type === "number" ||
    jsonSchema.type === "boolean"
  ) {
    return jsonSchema.type;
  }

  // recursive types
  if (jsonSchema.type === "array" && typeof jsonSchema.items === "object") {
    if (Array.isArray(jsonSchema.items)) {
      throw new Error(
        "Internal compiler error: we do not support array json schemas with multiple item types."
      );
    }
    return jsonSchemaToTypeScriptText(jsonSchema.items) + "[]";
  }

  if (jsonSchema.type === "object") {
    const required = jsonSchema.required || [];
    return (
      "{ " +
      Object.entries(jsonSchema.properties ?? {})
        .map(
          ([name, type]) =>
            name +
            (required.indexOf(name) === -1 ? "?" : "") +
            ": " +
            jsonSchemaToTypeScriptText(type as any) +
            ";"
        )
        .join(" ") +
      " }"
    );
  }

  throw new Error(
    `Internal compiler error: can't convert json schema to TypeScript: ${JSON.stringify(
      jsonSchema
    )}`
  );
};
const jsonSchemaConstToTypeScriptText = (
  schemaConst: number | string | boolean | null
) => {
  if (typeof schemaConst === "number") {
    return schemaConst.toString();
  }
  if (typeof schemaConst === "string") {
    return JSON.stringify(schemaConst);
  }
  if (typeof schemaConst === "boolean") {
    return schemaConst ? "true" : "false";
  }
  if (schemaConst === null) {
    return "null";
  }
  throw new Error(
    `Internal compilation error: the constant ${schemaConst} was not a number, string, boolean, or null.`
  );
};
