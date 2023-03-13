import { JSONSchema7 } from "json-schema";
import { jsonSchemaToTypeScriptText } from "./schema";

describe("jsonSchemaToTypeScriptText", () => {
  test.each<{ schema: JSONSchema7; type: string }>([
    { schema: { type: "string" }, type: "string" },
    { schema: { type: "null" }, type: "null" },
    { schema: { type: "number" }, type: "number" },
    { schema: { type: "integer" }, type: "number" },
    { schema: { type: "array", items: { type: "string" } }, type: "string[]" },
    {
      schema: { type: "object", properties: { foo: { type: "string" } } },
      type: "{ foo?: string; }",
    },
    { schema: { enum: ["one", "two"] }, type: '( "one" | "two" )' },
    { schema: { const: "hello" }, type: '"hello"' },
    { schema: { const: 4 }, type: "4" },
    { schema: { const: true }, type: "true" },
    { schema: { const: null }, type: "null" },
    {
      schema: { anyOf: [{ type: "string" }, { const: 4 }] },
      type: "( string | 4 )",
    },
  ])("Should map %s to %s", ({ schema, type }) => {
    expect(jsonSchemaToTypeScriptText(schema)).toEqual(type);
  });
});
