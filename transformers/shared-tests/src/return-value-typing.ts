import { CallImaginaryFunction, Compiler } from "./compiler";
import {
  compile,
  compileAndRunWithCallImaginaryMock,
  makeBimodalErrorTest,
  makeConditionalTest,
} from "./util";

declare global {
  namespace jest {
    interface Matchers<R> {
      toEqualJSONSchema(expected): Promise<R>;
    }
  }
}
export function defineTests(
  compiler: Compiler,
  supportNamedTypes = true,
  supportNamedPrimitives = true
) {
  const testWithNamedTypes = makeConditionalTest(
    supportNamedTypes,
    /types must be inlined|must have a return type of Promise/
  );
  const testWithNamedPrimitives = makeConditionalTest(
    supportNamedPrimitives,
    /types must be inlined|must have a return type of Promise/
  );
  const testWithInlineError = makeBimodalErrorTest(
    supportNamedPrimitives,
    /computed enums|return values from imaginary functions must be JSON-serializable and cannot be classes|types must be inlined/,
    "types must be inlined"
  );
  describe("imaginary transform return types", () => {
    // test helper that takes in a type as it will be described in the function declaration
    // and the JSON schema that should be output in the compiled script.
    function testReturnValueTyping(
      typeAsString: string,
      typeAsJSONSchema: any,
      preamble?: string
    ) {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `${preamble ?? ""}
      /**
      * @imaginary
      */
      declare function foo(): Promise<${typeAsString}>;
      foo();`,
        mock
      );

      // TODO: There doesn't seem to be a good way to make this library "see" the
      // updated Matchers, even when using a global.d.ts declaration of
      // toEqualJSONSchema. Would be nice to fix this.
      return (expect(mock.mock.calls[0][3]) as any).toEqualJSONSchema(
        typeAsJSONSchema
      );
    }

    test("should describe a string return type in JSON schema", () => {
      testReturnValueTyping("string", { type: "string" });
    });

    test("should describe a number return type in JSON schema", () => {
      testReturnValueTyping("number", { type: "number" });
    });

    test("should describe a boolean return type in JSON schema", () => {
      testReturnValueTyping("boolean", { type: "boolean" });
    });

    test("should describe a null return type in JSON schema", () => {
      testReturnValueTyping("null", { type: "null" });
    });

    test("should describe a constant string value return type in JSON schema", () => {
      testReturnValueTyping('"ConstantString"', {
        const: "ConstantString",
      });
    });

    test("should describe a constant string value return type in JSON schema", () => {
      testReturnValueTyping("345", { const: 345 });
    });

    testWithNamedTypes(
      "should describe a constant numeric enum return type in JSON schema",
      () => {
        testReturnValueTyping(
          "MyEnum",
          { enum: [0, 1, 2] },
          "enum MyEnum { a, b, c };"
        );
      }
    );

    testWithNamedTypes(
      "should describe a constant numeric enum with explicit values return type in JSON schema",
      () => {
        testReturnValueTyping(
          "MyEnum",
          { enum: [52, 122, 123] },
          "enum MyEnum { a = 52, b = 122, c };"
        );
      }
    );

    testWithNamedTypes(
      "should describe a constant numeric enum with one value return type in JSON schema",
      () => {
        testReturnValueTyping("MyEnum", { enum: [0] }, "enum MyEnum { a };");
      }
    );

    testWithNamedTypes(
      "should describe a constant string enum return type in JSON schema",
      () => {
        testReturnValueTyping(
          "MyEnum",
          { enum: ["name", "age", "height"] },
          "enum MyEnum { a = 'name', b = 'age', c = 'height'};"
        );
      }
    );

    testWithNamedTypes(
      "should describe a constant string enum with one value return type in JSON schema",
      () => {
        testReturnValueTyping(
          "MyEnum",
          { enum: ["name"] },
          "enum MyEnum { a = 'name' };"
        );
      }
    );

    test("should describe an ad-hoc string enum with >2 values return type in JSON schema", () => {
      testReturnValueTyping("'green' | 'red' | 'blue'", {
        anyOf: [{ const: "green" }, { const: "red" }, { const: "blue" }],
      });
    });

    test("should describe an ad-hoc numeric enum with >2 values return type in JSON schema", () => {
      testReturnValueTyping("12 | 1345 | 877", {
        anyOf: [{ const: 12 }, { const: 1345 }, { const: 877 }],
      });
    });

    test("should describe an ad-hoc multi typed enum with >2 values return type in JSON schema", () => {
      testReturnValueTyping("12 | 'green' | null", {
        anyOf: [{ type: "null" }, { const: 12 }, { const: "green" }],
      });
    });

    testWithInlineError(
      "should throw an error for return types with computed enums",
      () => {
        compile(
          compiler,
          `
        enum MyEnum {
          // constant members
          Name,
          // computed member
          Height = "123".length,
        }
        /**
        * @imaginary
        */
        declare function foo(): Promise<MyEnum>;`
        );
      }
    );

    test("should describe a simple inline object return type in JSON schema", () => {
      testReturnValueTyping("{foo: string; bar: number}", {
        type: "object",
        required: ["foo", "bar"],
        properties: { foo: { type: "string" }, bar: { type: "number" } },
      });
    });

    testWithNamedTypes(
      "should describe a simple interface return type in JSON schema",
      () => {
        testReturnValueTyping(
          "MyInterface",
          {
            type: "object",
            required: ["foo", "bar"],
            properties: { foo: { type: "string" }, bar: { type: "number" } },
          },
          "interface MyInterface {foo: string; bar: number};"
        );
      }
    );

    test("should describe a simple array return type in JSON schema", () => {
      testReturnValueTyping("string[]", {
        type: "array",
        items: { type: "string" },
      });
    });

    test("should describe an Array return type in JSON schema", () => {
      testReturnValueTyping("Array<string>", {
        type: "array",
        items: { type: "string" },
      });
    });

    // TODO: enable when Map rehydration is ready
    test.skip("should describe a Map return type in JSON schema", () => {
      testReturnValueTyping("Map<string, number>", {
        type: "object",
        additionalProperties: { type: "number" },
      });
    });
    test.skip("should fail if Map is not string-based", () => {
      expect(() => {
        compile(
          compiler,
          `/**
        * @imaginary
        */
        declare function foo(): Promise<Map<number, number>>`
        );
      }).toThrow("Map key type must be 'string'");
    });
    test("should describe a Record return type in JSON schema", () => {
      testReturnValueTyping("Record<string, number>", {
        type: "object",
        additionalProperties: { type: "number" },
      });
    });
    test("should fail if Record is not string-based", () => {
      expect(() => {
        compile(
          compiler,
          `/**
        * @imaginary
        */
        declare function foo(): Promise<Record<number, number>>`
        );
      }).toThrow("Record key type must be 'string'");
    });

    test("should describe a object return type with property names with spaces in JSON schema", () => {
      testReturnValueTyping('{"name with space": string;}', {
        type: "object",
        required: ["name with space"],
        properties: { "name with space": { type: "string" } },
      });
    });

    testWithNamedPrimitives(
      "should describe a compound return type in JSON schema",
      () => {
        testReturnValueTyping(
          "{person: {names?: string[], isCool: boolean, superPower: SuperPower}[]}[]",
          {
            type: "array",
            items: {
              type: "object",
              required: ["person"],
              properties: {
                person: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["isCool", "superPower"],
                    properties: {
                      names: {
                        type: "array",
                        items: { type: "string" },
                      },
                      isCool: { type: "boolean" },
                      superPower: {
                        type: "object",
                        required: ["power", "originStory"],
                        properties: {
                          power: { type: "string" },
                          originStory: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "interface SuperPower {power: string; originStory: string};"
        );
      }
    );

    test("should support parenthesesed types", () => {
      testReturnValueTyping('("a"|"b"|"c")[]', {
        type: "array",
        items: {
          anyOf: [
            {
              const: "a",
            },
            {
              const: "b",
            },
            {
              const: "c",
            },
          ],
        },
      });
    });

    test("should describe a object return type with optional and required members in JSON schema", () => {
      testReturnValueTyping("{name?: string; age: number}", {
        type: "object",
        required: ["age"],
        properties: { name: { type: "string" }, age: { type: "number" } },
      });
    });

    test("should describe a object return type with ALL optional members in JSON schema", () => {
      testReturnValueTyping("{name?: string;}", {
        type: "object",
        properties: { name: { type: "string" } },
      });
    });

    testWithNamedTypes(
      "should describe a interface return type with optional and required members in JSON schema",
      () => {
        testReturnValueTyping(
          "MyInterface",
          {
            type: "object",
            required: ["age"],
            properties: { name: { type: "string" }, age: { type: "number" } },
          },
          "interface MyInterface {name?: string; age: number}"
        );
      }
    );

    test("should describe a union type in JSON schema", () => {
      testReturnValueTyping("string | number", {
        anyOf: [{ type: "string" }, { type: "number" }],
      });
    });

    test("should fail for intersection types", () => {
      expect(() => {
        compile(
          compiler,
          `/**
        * @imaginary
        */
        declare function foo(p: {a: string} & {b: string}): Promise<string>`
        );
      }).toThrow("we do not yet support intersection types");
    });
    test("should describe a union type with null in JSON schema", () => {
      testReturnValueTyping("string | null", {
        anyOf: [{ type: "null", nullable: true }, { type: "string" }],
      });
    });

    test("should describe a >2 union type in JSON schema", () => {
      // TODO: this should probably return {type: "boolean"} rather than anyOf(true, false)
      testReturnValueTyping("string | number | boolean", {
        anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
      });
    });

    test("should describe a more complex union type in JSON schema", () => {
      testReturnValueTyping("{name?: string; age: number}|string[]", {
        anyOf: [
          { type: "array", items: { type: "string" } },
          {
            type: "object",
            required: ["age"],
            properties: { name: { type: "string" }, age: { type: "number" } },
          },
        ],
      });
    });

    testWithNamedTypes("should replace an aliased type in the method", () => {
      testReturnValueTyping(
        "MyType[]",
        {
          type: "array",
          items: {
            type: "object",
            required: ["age"],
            properties: { name: { type: "string" }, age: { type: "number" } },
          },
        },
        "type MyType = {name?:string; age:number};"
      );
    });

    test("throws an error if return type isn't a Promise", () => {
      expect(() => {
        compile(
          compiler,
          `/**
        * @imaginary
        */
        declare function foo(): string;`
        );
      }).toThrow(
        "all imaginary functions must have a return type of Promise<T>"
      );
    });

    test("throws an error if return type is a Promise and has more than one type argument", () => {
      expect(() => {
        compile(
          compiler,
          `/**
        * @imaginary
        */
        declare function foo(): Promise<string, number>;`
        );
      }).toThrow(
        "all imaginary functions must have a return type of Promise<T>"
      );
    });

    test("throws an error if return type is a Promise and has no type argument", () => {
      expect(() => {
        compile(
          compiler,
          `/**
        * @imaginary
        */
        declare function foo(): Promise;`
        );
      }).toThrow(
        "all imaginary functions must have a return type of Promise<T>"
      );
    });

    testWithNamedPrimitives(
      "doesn't throw an error if return type is a Promise alias",
      () => {
        compile(
          compiler,
          `type NewName<T> = Promise<T>;
        /**
        * @imaginary
        */
        declare function foo(): NewName<string>;`
        );
      }
    );

    testWithInlineError("throws an error if return type is class", () => {
      compile(
        compiler,
        `
        class MyClass {
          
        }
        /**
        * @imaginary
        */
        declare function foo(): Promise<MyClass>;`
      );
    });

    test("throws an error if return type is function", () => {
      expect(() => {
        compile(
          compiler,
          `
        /**
        * @imaginary
        */
        declare function foo(): Promise<(string) => string>;`
        );
      }).toThrow(
        "return values from imaginary functions must be JSON-serializable and cannot have function"
      );
    });

    test("throws an error if return type is intersection", () => {
      expect(() => {
        compile(
          compiler,
          `
\        /**
        * @imaginary
        */
        declare function foo(): Promise<{name: string; age: number;} & {name: string; isCool:boolean;}>;`
        );
      }).toThrow("we do not yet support intersection types");
    });
  });
}
