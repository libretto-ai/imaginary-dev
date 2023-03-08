import { describe, expect, jest, test } from "@jest/globals";
import { CallImaginaryFunction, Compiler } from "./compiler";
import {
  compileAndRunWithCallImaginaryMock,
  makeConditionalTest,
} from "./util";

export function defineTests(
  compiler: Compiler,
  supportNamedTypes = true,
  supportReExports = true
) {
  const testWithNamedTypes = makeConditionalTest(
    supportNamedTypes,
    "types must be inlined"
  );
  const testWithExports = makeConditionalTest(
    supportReExports,
    "is not a function"
  );

  describe("imaginary transform multi file", () => {
    testWithNamedTypes(
      "should describe a simple object return type in JSON schema",
      () => {
        // test helper that takes in a type as it will be described in the function declaration
        // and the JSON schema that should be output in the compiled script.
        const mock: jest.Mock<CallImaginaryFunction> = jest.fn();

        compileAndRunWithCallImaginaryMock(
          compiler,
          {
            projectFiles: {
              "my-type.ts": `export type MyType = {foo: string; bar: number};`,
              "index.ts": `import { MyType } from "./my-type";
              /**
            * @imaginary
            */
            declare function foo(): Promise<MyType>;
            foo();`,
            },
            rootFiles: ["index.ts"],
          },
          mock
        );

        expect(mock.mock.calls[0][3]).toEqual({
          type: "object",
          required: ["foo", "bar"],
          properties: { foo: { type: "string" }, bar: { type: "number" } },
        });
      }
    );

    test("should be able to export declare an imaginary function in one file and use in another", () => {
      // test helper that takes in a type as it will be described in the function declaration
      // and the JSON schema that should be output in the compiled script.
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();

      compileAndRunWithCallImaginaryMock(
        compiler,
        {
          projectFiles: {
            "my-imaginary-fn.ts": `
              /**
               * This is a super duper foo function!
               * @imaginary
               */
              export declare function foo(): Promise<string>;
            `,
            "index.ts": `
            import { foo } from "./my-imaginary-fn";
              
            foo();`,
          },
          rootFiles: ["index.ts"],
        },
        mock
      );

      // just make sure that foo got called and passed the comment in.
      expect(mock.mock.calls[0][0]).toMatch("super duper foo");
    });

    test("should be able to declare an imaginary function and then export in one file and use in another", () => {
      // test helper that takes in a type as it will be described in the function declaration
      // and the JSON schema that should be output in the compiled script.
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();

      compileAndRunWithCallImaginaryMock(
        compiler,
        {
          projectFiles: {
            "my-imaginary-fn.ts": `
              /**
               * This is a super duper foo function!
               * @imaginary
               */
              declare function foo(): Promise<string>;

              export { foo };
            `,
            "index.ts": `
            import { foo } from "./my-imaginary-fn";
              
            foo();`,
          },
          rootFiles: ["index.ts"],
        },
        mock
      );

      // just make sure that foo got called and passed the comment in.
      expect(mock.mock.calls[0][0]).toMatch("super duper foo");
    });

    testWithExports(
      "should be able to declare an imaginary function and then export as another name in one file and use in another",
      () => {
        // test helper that takes in a type as it will be described in the function declaration
        // and the JSON schema that should be output in the compiled script.
        const mock: jest.Mock<CallImaginaryFunction> = jest.fn();

        compileAndRunWithCallImaginaryMock(
          compiler,
          {
            projectFiles: {
              "my-imaginary-fn.ts": `
              /**
               * This is a super duper foo function!
               * @imaginary
               */
              declare function foo(): Promise<string>;

              export { foo as bar };
            `,
              "index.ts": `
            import { bar } from "./my-imaginary-fn";
              
            bar();`,
            },
            rootFiles: ["index.ts"],
          },
          mock
        );

        // just make sure that foo got called and passed the comment in.
        expect(mock.mock.calls[0][0]).toMatch("super duper foo");
      }
    );

    testWithExports(
      "should be able to declare an imaginary function and then export as default in one file and use in another",
      () => {
        // test helper that takes in a type as it will be described in the function declaration
        // and the JSON schema that should be output in the compiled script.
        const mock: jest.Mock<CallImaginaryFunction> = jest.fn();

        compileAndRunWithCallImaginaryMock(
          compiler,
          {
            projectFiles: {
              "my-imaginary-fn.ts": `
                /**
                 * This is a super duper foo function!
                 * @imaginary
                 */
                declare function foo(): Promise<string>;
  
                export { foo as default };
              `,
              "index.ts": `
              import bar from "./my-imaginary-fn";
                
              bar();`,
            },
            rootFiles: ["index.ts"],
          },
          mock
        );

        // just make sure that foo got called and passed the comment in.
        expect(mock.mock.calls[0][0]).toMatch("super duper foo");
      }
    );
  });
}
