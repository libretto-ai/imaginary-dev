import { CallImaginaryFunction, Compiler } from "./compiler";
import {
  compileAndRunWithCallImaginaryMock,
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
  supportAliasedPrimitives = true
) {
  const testWithNamedTypes = makeConditionalTest(
    supportNamedTypes,
    "types must be inlined"
  );
  const testWithNamedPrimitives = makeConditionalTest(
    supportAliasedPrimitives,
    "types must be inlined"
  );

  describe("imaginary transform return types", () => {
    testWithNamedPrimitives("should inline aliased literal string type", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `type MyType = "happy";
                  /**
                  * @imaginary
                  */
                  declare function foo(): Promise<MyType>;
                  foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({ const: "happy" });
    });

    testWithNamedPrimitives("should inline aliased literal number type", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `type MyType = 42;
                  /**
                  * @imaginary
                  */
                  declare function foo(): Promise<MyType>;
                  foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({ const: 42 });
    });

    testWithNamedPrimitives(
      "should inline aliased literal boolean type",
      () => {
        const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
        compileAndRunWithCallImaginaryMock(
          compiler,
          `type MyType = false;
                  /**
                  * @imaginary
                  */
                  declare function foo(): Promise<MyType>;
                  foo();`,
          mock
        );

        expect(mock.mock.calls[0][3]).toEqual({ const: false });
      }
    );

    testWithNamedPrimitives(
      "should inline aliased primitive string type",
      () => {
        const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
        compileAndRunWithCallImaginaryMock(
          compiler,
          `type MyType = string;
                  /**
                  * @imaginary
                  */
                  declare function foo(): Promise<MyType>;
                  foo();`,
          mock
        );

        expect(mock.mock.calls[0][3]).toEqual({ type: "string" });
      }
    );

    testWithNamedPrimitives(
      "should inline aliased primitive number type",
      () => {
        const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
        compileAndRunWithCallImaginaryMock(
          compiler,
          `type MyType = number;
                  /**
                  * @imaginary
                  */
                  declare function foo(): Promise<MyType>;
                  foo();`,
          mock
        );

        expect(mock.mock.calls[0][3]).toEqual({ type: "number" });
      }
    );

    testWithNamedPrimitives(
      "should inline aliased primitive boolean type",
      () => {
        const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
        compileAndRunWithCallImaginaryMock(
          compiler,
          `type MyType = boolean;
                  /**
                  * @imaginary
                  */
                  declare function foo(): Promise<MyType>;
                  foo();`,
          mock
        );

        expect(mock.mock.calls[0][3]).toEqual({ type: "boolean" });
      }
    );

    testWithNamedPrimitives("should inline aliased primitive null type", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `type MyType = null;
                /**
                * @imaginary
                */
                declare function foo(): Promise<MyType>;
                foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({ type: "null" });
    });

    testWithNamedPrimitives("should inline arrays of aliased types", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `type MyType = string;
              /**
              * @imaginary
              */
              declare function foo(): Promise<MyType[]>;
              foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({
        type: "array",
        items: { type: "string" },
      });
    });

    testWithNamedTypes("should inline aliased enum number types", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `enum MyEnum { A, B, C };
                /**
                * @imaginary
                */
                declare function foo(): Promise<MyEnum>;
                foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({ enum: [0, 1, 2] });
    });

    testWithNamedTypes("should inline aliased enum string types", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `enum MyEnum { 
              A = "car", 
              B = "wheels",
              C = "gravel",
              D = "road"
            };
                  /**
                  * @imaginary
                  */
                  declare function foo(): Promise<MyEnum>;
                  foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({
        enum: ["car", "wheels", "gravel", "road"],
      });
    });

    testWithNamedTypes(
      "should inline aliased string constant union types",
      () => {
        const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
        compileAndRunWithCallImaginaryMock(
          compiler,
          `type MyType = "car" | "wheels" | "gravel" | "road";
              /**
               * @imaginary
               */
              declare function foo(): Promise<MyType>;
              foo();`,
          mock
        );

        expect(mock.mock.calls[0][3]).toEqual({
          anyOf: [
            { const: "car" },
            { const: "wheels" },
            { const: "gravel" },
            { const: "road" },
          ],
        });
      }
    );

    testWithNamedTypes("should inline aliased union types", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `type MyType = string | number
              /**
               * @imaginary
               */
              declare function foo(): Promise<MyType>;
              foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({
        anyOf: [{ type: "string" }, { type: "number" }],
      });
    });

    testWithNamedTypes("should inline aliased interface types", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `interface MyInterface {name?: string; age: number};
                /**
                * @imaginary
                */
                declare function foo(): Promise<MyInterface>;
                foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({
        type: "object",
        required: ["age"],
        properties: { name: { type: "string" }, age: { type: "number" } },
      });
    });

    testWithNamedTypes("should inline aliased object types", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `type MyType = {name?: string; age: number};
                /**
                * @imaginary
                */
                declare function foo(): Promise<MyType>;
                foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({
        type: "object",
        required: ["age"],
        properties: { name: { type: "string" }, age: { type: "number" } },
      });
    });

    testWithNamedTypes("should inline doubly aliased object types", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `type MyType1 = {name?: string; age: number};
          type MyType2 = MyType1;
            /**
            * @imaginary
            */
            declare function foo(): Promise<MyType2>;
            foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({
        type: "object",
        required: ["age"],
        properties: { name: { type: "string" }, age: { type: "number" } },
      });
    });

    testWithNamedTypes("should inline nested aliased object types", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `type NameType = {firstName: string; lastName: string;};
        type MyType = {name?: NameType; age: number};
          /**
          * @imaginary
          */
          declare function foo(): Promise<MyType>;
          foo();`,
        mock
      );

      expect(mock.mock.calls[0][3]).toEqual({
        type: "object",
        required: ["age"],
        properties: {
          name: {
            type: "object",
            required: ["firstName", "lastName"],
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
            },
          },
          age: { type: "number" },
        },
      });
    });
  });
}
