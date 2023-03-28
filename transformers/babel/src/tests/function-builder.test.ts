import { compileTestCode } from "./babel-test-compiler";

describe("transformer tests", () => {
  it("should compile with no params", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo();`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo() {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [], {});
        }
      }"
    `);
  });
  it("should compile with simple parameter", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string);`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            param1
          });
        }
      }"
    `);
  });
  it("should ignore non-imaginary", () => {
    const declaration = `
/**
  * This isn't imaginary
  */
declare function foo(param1: string);`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`null`);
  });
  it("should require a promise-based response", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string): string;`;
    expect(() => {
      const code = compileTestCode(declaration);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Imaginary function compilation error: all imaginary functions must have a return type of Promise<T>"`
    );
  });
  it("should handle awaited string response", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string): Promise<string>;`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            "type": "string"
          }, {
            param1
          });
        }
      }"
    `);
  });
  it("should handle awaited number response", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string): Promise<number>;`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            "type": "number"
          }, {
            param1
          });
        }
      }"
    `);
  });

  it("should handle awaited inline object type response", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string): Promise<{value1: number}>;`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            "type": "object",
            "properties": {
              "value1": {
                "type": "number"
              }
            },
            "required": ["value1"]
          }, {
            param1
          });
        }
      }"
    `);
  });
  it("should handle awaited inline array type response", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string): Promise<string[]>;`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            "type": "array",
            "items": {
              "type": "string"
            }
          }, {
            param1
          });
        }
      }"
    `);
  });
  it("should handle awaited inline array type response", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string): Promise<string[]>;`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            "type": "array",
            "items": {
              "type": "string"
            }
          }, {
            param1
          });
        }
      }"
    `);
  });
  it("should handle awaited union type response", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string): Promise<string|number>;`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            "anyOf": [{
              "type": "string"
            }, {
              "type": "number"
            }]
          }, {
            param1
          });
        }
      }"
    `);
  });
  it("should handle awaited constant response", () => {
    const declaration = `
/**
  * @imaginary
  */
declare function foo(param1: string): Promise<'stringvalue'>;`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n  * @imaginary\\n  */", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            "const": "stringvalue"
          }, {
            param1
          });
        }
      }"
    `);
  });
  it("should handle awaited constant response", () => {
    const declaration = `
/**
* @imaginary
*/
declare function foo(param1: string): Promise<'stringvalue'>;`;
    const code = compileTestCode(declaration);
    expect(code).toMatchInlineSnapshot(`
      "{
        import * as __runPrompt$Test from "@imaginary-dev/runtime";
        export async function foo(param1) {
          return __runPrompt$Test.callImaginaryFunction("/**\\n* @imaginary\\n*/", "foo", [{
            name: "param1",
            type: {
              "type": "string"
            }
          }], {
            "const": "stringvalue"
          }, {
            param1
          });
        }
      }"
    `);
  });
});
