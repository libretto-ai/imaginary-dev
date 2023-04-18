import { jsonSchemaToTypeScriptText } from "@imaginary-dev/util";
import { JSONSchema7 } from "json-schema";

export function safeJsonSchemaToTypeScriptText(schema?: JSONSchema7) {
  if (!schema) {
    return null;
  }
  try {
    return jsonSchemaToTypeScriptText(schema);
  } catch (ex) {
    return null;
  }
}
