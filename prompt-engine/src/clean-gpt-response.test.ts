import { describe, test } from "@jest/globals";
import cleanGptResponse from "./clean-gpt-response";

describe("GPT response cleaner", () => {
  test("should deal with basic compliant JSON", () => {
    const objectToTest = {
      name: "Angela",
      age: 56,
      isTall: true,
      friends: [{ name: "Sunny", relationship: "cousin" }],
    };
    expect(
      cleanGptResponse(JSON.stringify(objectToTest), {
        type: "object",
        required: ["name", "age", "isTall", "friends"],
        properties: {
          name: { type: "string" },
          age: { type: "number" },
          isTall: { type: "boolean" },
          friends: {
            type: "object",
            required: ["name", "relationship"],
            properties: {
              name: { type: "string" },
              relationship: { type: "string" },
            },
          },
        },
      })
    ).toEqual(objectToTest);
  });

  test("should be able to return a null", () => {
    expect(cleanGptResponse('{"value": null}', { type: "null" })).toEqual(null);
  });

  test("should be able to return a true boolean", () => {
    expect(cleanGptResponse('{"value": true}', { type: "boolean" })).toEqual(
      true
    );
  });

  test("should be able to return a false boolean", () => {
    expect(cleanGptResponse('{"value": false}', { type: "boolean" })).toEqual(
      false
    );
  });

  test.skip("should be able to return a simple string when type is just string", () => {
    expect(
      cleanGptResponse("this string was returned from GPT.", { type: "string" })
    ).toEqual("this string was returned from GPT.");
  });

  test.skip("should be able to return a simple string with single quote when type is just string", () => {
    expect(
      cleanGptResponse("this string was 'returned' from GPT.", {
        type: "string",
      })
    ).toEqual("this string was 'returned' from GPT.");
  });

  test.skip("should be able to return a simple string with double quote when type is just string", () => {
    expect(
      cleanGptResponse('this string was "returned" from GPT.', {
        type: "string",
      })
    ).toEqual('this string was "returned" from GPT.');
  });

  test("should be able to deal with a const string with double quotes", () => {
    expect(cleanGptResponse('{"value": "red"}', { const: "red" })).toBe("red");
  });

  test("should be able to deal with a newline string with double quotes", () => {
    expect(cleanGptResponse('{"value": "\\n"}', { const: "\n" })).toBe("\n");
  });

  test("should be able to deal with a newline string with single quotes", () => {
    expect(cleanGptResponse("{\"value\": '\\n'}", { const: "\n" })).toBe("\n");
  });

  test("should be able to deal with hex escapes with double quotes", () => {
    expect(
      cleanGptResponse('{"value": "\\x4F\\x4d\\x47"}', { const: "OMG" })
    ).toBe("OMG");
  });

  test("should be able to deal with hex escapes with single quotes", () => {
    expect(
      cleanGptResponse("{\"value\": '\\x4F\\x4d\\x47'}", { const: "OMG" })
    ).toBe("OMG");
  });

  test("should be able to deal with unicode escapes with double quotes", () => {
    // got this string from https://clagnut.com/blog/2380/#Malayalam
    expect(
      cleanGptResponse(
        '{"value": "\\u101e\\u102E\\u101f\\u102D\\u102f\\u1020\\u103a\\u1019\\u103E"}',
        { const: "သီဟိုဠ်မှ" }
      )
    ).toBe("သီဟိုဠ်မှ");
  });

  test("should be able to deal with unicode escapes with single quotes", () => {
    // got this string from https://clagnut.com/blog/2380/#Malayalam
    expect(
      cleanGptResponse(
        "{\"value\": '\\u101e\\u102E\\u101f\\u102D\\u102f\\u1020\\u103a\\u1019\\u103E'}",
        { const: "သီဟိုဠ်မှ" }
      )
    ).toBe("သီဟိုဠ်မှ");
  });

  test("should be able to deal with a const string with single quotes", () => {
    expect(cleanGptResponse("{\"value\": 'red'}", { const: "red" })).toBe(
      "red"
    );
  });

  test.skip("should be able to deal with a const string without quotes", () => {
    expect(cleanGptResponse("red", { const: "red" })).toBe("red");
  });

  test("should be able to deal with a enum string with double quotes", () => {
    expect(
      cleanGptResponse('{"value": "red"}', { enum: ["green", "red", "blue"] })
    ).toBe("red");
    expect(
      cleanGptResponse('{"value": "red"}', {
        anyOf: [{ const: "green" }, { const: "red" }, { const: "blue" }],
      })
    ).toBe("red");
  });

  test.skip("should be able to deal with a enum string without quotes", () => {
    expect(cleanGptResponse("red", { enum: ["green", "red", "blue"] })).toBe(
      "red"
    );
    expect(
      cleanGptResponse("red", {
        anyOf: [{ const: "green" }, { const: "red" }, { const: "blue" }],
      })
    ).toBe("red");
  });

  test("should be able to return a simple number when type is number", () => {
    expect(cleanGptResponse(`{"value": 42}`, { type: "number" })).toEqual(42);
  });

  test("should be able to return a negative number when type is number", () => {
    expect(cleanGptResponse('{"value": -42}', { type: "number" })).toEqual(-42);
  });

  test("should be able to return a decimal number when type is number", () => {
    expect(cleanGptResponse('{"value": 42.42}', { type: "number" })).toEqual(
      42.42
    );
  });

  test("should be able to return a decimal number with exponent when type is number", () => {
    expect(cleanGptResponse('{"value": 42.42e4}', { type: "number" })).toEqual(
      424_200
    );
  });

  test("should be able to return a decimal number with negative exponent when type is number", () => {
    expect(cleanGptResponse('{"value": 42.42e-2}', { type: "number" })).toEqual(
      0.4242
    );
  });

  test("should be able to return a simple number when type is number", () => {
    expect(cleanGptResponse('{"value": 42e3}', { type: "number" })).toEqual(
      42_000
    );
  });

  test("should be able to return a simple number when type is number", () => {
    expect(cleanGptResponse('{"value": 42e100}', { type: "number" })).toEqual(
      42e100
    );
  });

  test("should be able to return a simple number when type is number", () => {
    expect(cleanGptResponse('{"value": 42e-2}', { type: "number" })).toEqual(
      0.42
    );
  });

  test("should be able to return an empty array", () => {
    expect(
      cleanGptResponse("[]", { type: "array", items: { type: "string" } })
    ).toEqual([]);
  });

  test("should be able to return an array of numbers", () => {
    expect(
      cleanGptResponse("[1, 2, 3]", {
        type: "array",
        items: { type: "number" },
      })
    ).toEqual([1, 2, 3]);
  });

  test("should be able to return an array of numbers with newlines", () => {
    expect(
      cleanGptResponse(
        `[1,
        2,
        3]`,
        {
          type: "array",
          items: { type: "number" },
        }
      )
    ).toEqual([1, 2, 3]);
  });

  test("should be able to return a simple object", () => {
    expect(
      cleanGptResponse("{ name: 'Shirley' , age: 44}", {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      })
    ).toEqual({ name: "Shirley", age: 44 });
  });

  test("should be able to return a simple object with newlines", () => {
    expect(
      cleanGptResponse(
        `{ 
        name: 'Shirley',
        age: 44
      }`,
        {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        }
      )
    ).toEqual({ name: "Shirley", age: 44 });
  });

  test("should be able to return an object with property names with double quotes and spaces around", () => {
    expect(
      cleanGptResponse(`{ "quotedname" : "Elliot" }`, {
        type: "object",
        properties: {
          quotedname: { type: "string" },
        },
      })
    ).toEqual({
      quotedname: "Elliot",
    });
  });

  test("should be able to return an object with property names with single quotes and spaces around", () => {
    expect(
      cleanGptResponse(`{ 'quotedname' : "Elliot" }`, {
        type: "object",
        properties: {
          quotedname: { type: "string" },
        },
      })
    ).toEqual({
      quotedname: "Elliot",
    });
  });

  test("should be able to return an object with property names with a space", () => {
    expect(
      cleanGptResponse(`{ "spaced name": "Elliot" }`, {
        type: "object",
        properties: {
          "spaced name": { type: "string" },
        },
      })
    ).toEqual({
      "spaced name": "Elliot",
    });
  });

  test("should be able to return an empty object", () => {
    expect(
      cleanGptResponse("{}", {
        type: "object",
        properties: {},
      })
    ).toEqual({});
  });

  test("can deal with an object with an undefined value", () => {
    expect(
      cleanGptResponse('{name: "Joan", age: undefined}', {
        type: "object",
        properties: { name: { type: "string" } },
      })
    ).toEqual({ name: "Joan" });
  });

  // Real world test cases
  test("can deal with a missing comma in an object", () => {
    expect(
      cleanGptResponse("{units: 'dozen' unitType: 'other'}", {
        type: "object",
        properties: {
          units: { type: "string" },
          unitType: { type: "string" },
        },
      })
    ).toEqual({ units: "dozen", unitType: "other" });
  });

  test("can deal with a whitespace after undefined last member in an object", () => {
    expect(
      cleanGptResponse(`{name:'eggs',quantity:undefined }`, {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
        },
      })
    ).toEqual({ name: "eggs" });
  });

  test("can deal with new lines before and after undefined last member in an object", () => {
    expect(
      cleanGptResponse(
        `{name:'eggs',quantity:
      undefined
    }`,
        {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            quantity: { type: "number" },
          },
        }
      )
    ).toEqual({ name: "eggs" });
  });

  test("can deal with a object property with an empty string value", () => {
    expect(
      cleanGptResponse(`{name: ''}`, {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
        },
      })
    ).toEqual({ name: "" });
  });

  test("can deal with trailing array comma with whitespace", () => {
    expect(
      cleanGptResponse(`[1, 2, ]`, {
        type: "array",
        items: {
          type: "array",
          items: { type: "number" },
        },
      })
    ).toEqual([1, 2]);
  });

  test("can deal with trailing array comma with newline", () => {
    expect(
      cleanGptResponse(
        `[1, 2,
  ]`,
        {
          type: "array",
          items: {
            type: "array",
            items: { type: "number" },
          },
        }
      )
    ).toEqual([1, 2]);
  });

  test("can deal with trailing object comma with whitespace", () => {
    expect(
      cleanGptResponse(`{tree: "birch", }`, {
        type: "object",
        properties: {
          tree: { type: "string" },
        },
      })
    ).toEqual({ tree: "birch" });
  });

  test("can deal with trailing object comma with newline", () => {
    expect(
      cleanGptResponse(
        `{tree: "birch",
      }`,
        {
          type: "object",
          properties: {
            tree: { type: "string" },
          },
        }
      )
    ).toEqual({ tree: "birch" });
  });

  test("can deal with smart double quotes in attribute name", () => {
    expect(
      cleanGptResponse(`{ “tree”: "birch" }`, {
        type: "object",
        properties: {
          tree: { type: "string" },
        },
      })
    ).toEqual({ tree: "birch" });
  });

  test("can deal with smart single quotes in attribute name", () => {
    expect(
      cleanGptResponse(`{ ‘tree’: "birch" }`, {
        type: "object",
        properties: {
          tree: { type: "string" },
        },
      })
    ).toEqual({ tree: "birch" });
  });

  test("can deal with smart double quotes in a value", () => {
    expect(
      cleanGptResponse(`{ "tree": “birch” }`, {
        type: "object",
        properties: {
          tree: { type: "string" },
        },
      })
    ).toEqual({ tree: "birch" });
  });

  test("can deal with smart single quotes in a value", () => {
    expect(
      cleanGptResponse(`{ "tree": ‘birch’ }`, {
        type: "object",
        properties: {
          tree: { type: "string" },
        },
      })
    ).toEqual({ tree: "birch" });
  });
});
