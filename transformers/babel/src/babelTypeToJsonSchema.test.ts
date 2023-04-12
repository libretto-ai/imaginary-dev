import * as t from "@babel/types";
import { JSONSchema7 } from "json-schema";
import { babelTypeToJsonSchema } from "./babelTypeToJsonSchema";

describe("babelTypeToJsonSchema", () => {
  it.each<{ type: t.TSType; schema: JSONSchema7 }>([
    {
      type: t.tsBooleanKeyword(),
      schema: {
        type: "boolean",
      },
    },
    {
      type: t.tsNumberKeyword(),
      schema: {
        type: "number",
      },
    },
    {
      type: t.tsStringKeyword(),
      schema: {
        type: "string",
      },
    },
    {
      type: t.tsNullKeyword(),
      schema: {
        type: "null",
      },
    },
    {
      type: t.tsAnyKeyword(),
      schema: {
        type: ["object", "string", "number", "boolean", "null", "array"],
      },
    },
    {
      type: t.tsArrayType(t.tsStringKeyword()),
      schema: {
        type: "array",
        items: { type: "string" },
      },
    },
  ])("should convert %p", ({ type, schema }) => {
    const result = babelTypeToJsonSchema(type);
    expect(result).toEqual(schema);
  });
});
