import { CallImaginaryFunction, Compiler } from "./compiler";
import {
  CALL_IMAGINARY_FUNCTION_NAME,
  compile,
  compileAndRunWithCallImaginaryMock,
} from "./util";

export function defineTests(compiler: Compiler) {
  describe("imaginary transformer basic transforms", () => {
    test("should not transform or throw an error on a function with type params and without @imaginary TsDoc tag (bug #182)", () => {
      const actual = compile(
        compiler,
        `
  /**
   * This function returns a random string.
   * @returns a random string.
   */
  declare function doSomething<T extends string>(arg1: T) : Promise<number>;`
      );

      expect(actual).not.toMatch(CALL_IMAGINARY_FUNCTION_NAME);
    });

    test("should transform an function with @imaginary TsDoc tag", () => {
      const actual = compile(
        compiler,
        `
  /**
   * This function returns a random string.
   * @returns a random string.
   * @imaginary
   */
   declare function doSomething() : Promise<number>;`
      );

      expect(actual).toMatch(CALL_IMAGINARY_FUNCTION_NAME);
    });

    test("should not transform an function without @imaginary TsDoc tag", () => {
      const actual = compile(
        compiler,
        `
  /**
   * This function returns a random string.
   * @returns a random string.
   */
   declare function doSomething() : Promise<number>;`
      );

      expect(actual).not.toMatch(CALL_IMAGINARY_FUNCTION_NAME);
      expect(actual.trim()).toHaveLength(0);
    });

    test("should not throw when there are two declarations of a non-imaginary function", () => {
      expect(() =>
        compile(
          compiler,
          `
  /**
   * This function returns a random string.
   * @returns a random string.
   */
   declare function doSomething() : Promise<number>;
   
   declare function doSomething(name: string): Promise<number>;`
        )
      ).not.toThrow();
    });
    test("Should throw when type variables are provided", () => {
      expect(() =>
        compile(
          compiler,
          `
      /**
       * @imaginary
       */
      declare function doSomethinge<T>(): Promise<string>;`
        )
      ).toThrow("Functions cannot include type variables");
    });

    // TODO: is this the right behavior, or should we throw an error?
    test("should get the right declaration of a non-imaginary function", () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `
  /**
   * This function returns a random string.
   * @returns a random string.
   * @imaginary
   */
   declare function doSomething() : Promise<string>;
   
   declare function doSomething(isGood: boolean): Promise<number>;
   
   doSomething();`,
        mock
      );

      expect(mock.mock.calls[0][0]).toMatch(
        "This function returns a random string."
      );
      expect(mock.mock.calls[0][1]).toEqual("doSomething");
      expect(mock.mock.calls[0][2]).toEqual([]);
      expect(mock.mock.calls[0][3]).toEqual({ type: "string" });
    });

    test("should be fine with non-TsDoc comments before a function", async () => {
      // When I first wrote the transformer, the TsDoc compiler freaked out when it encountered a
      // non-TsDoc comment before a function.
      expect(() =>
        compile(
          compiler,
          `
    // not a TsDoc comment
    declare function doSomething() : Promise<number>;`
        )
      ).not.toThrow();
    });

    test("should be ok when the function declare comes right after the TsDoc comment", async () => {
      // had an off-by-one error where the "declare" was getting cut off to "eclare"
      // when it was right after the TsDoc comment.
      const actual = compile(
        compiler,
        `
    /**
     * TsDoc comment uniqueword1
     * @imaginary
     */declare function doSomething() : Promise<number>;`
      );
      expect(actual).toMatch("doSomething");
      expect(actual).toMatch("uniqueword1");
    });

    test("should throw when there are >1 TsDoc @imaginary comments", async () => {
      expect(() =>
        compile(
          compiler,
          `
    /**
     * TsDoc comment uniqueword1
     * @imaginary
     */
    /**
     * TsDoc comment uniqueword2
     * @imaginary
     */
    declare function doSomething() : Promise<number>;`
        )
      ).toThrow(
        "imaginary functions should only have one @imaginary TsDoc comment"
      );
    });

    test("should be fine with TsDoc comments and normal comments mixed", async () => {
      // anything from other comments should not be included in the translation.
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `
    // not a TsDoc comment uniqueword1
    /**
     * TsDoc comment uniqueword2
     * @imaginary
     */
    // also not a TsDoc comment uniqueword3
    /* still not a TsDoc comment uniqueword4 */
    declare function doSomething() : Promise<number>; /* uniqueword5 */ // uniqueword6
    // uniqueword7
    /** 
     * uniqueword8
     * @imaginary
     */
    /* uniqueword9 */
    
    doSomething();`,
        mock
      );

      const imaginaryComment = mock.mock.calls[0][0];
      expect(imaginaryComment).not.toMatch("uniqueword1");
      expect(imaginaryComment).toMatch("uniqueword2");
      expect(imaginaryComment).not.toMatch("uniqueword3");
      expect(imaginaryComment).not.toMatch("uniqueword4");
      expect(imaginaryComment).not.toMatch("uniqueword5");
      expect(imaginaryComment).not.toMatch("uniqueword6");
      expect(imaginaryComment).not.toMatch("uniqueword7");
      expect(imaginaryComment).not.toMatch("uniqueword8");
      expect(imaginaryComment).not.toMatch("uniqueword9");
    });

    test("should pass the function comment to callImaginaryFunction", async () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `
    /**
     * Supercalifragilisticexpialidocious
     * @imaginary
     */
    declare function foo(): Promise<string>;
    foo();`,
        mock
      );
      expect(mock.mock.calls[0][0]).toMatch(
        "Supercalifragilisticexpialidocious"
      );
    });

    test("should hoist imports so that imaginary functions further down can be called", async () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `
    foo();
    /**
     * @imaginary
     */
    declare function foo(): Promise<string>;`,
        mock
      );
      expect(mock).toHaveBeenCalled();
    });

    test("Should ignore fatal TsDoc errors when something is not imaginary", () => {
      const actual = compile(
        compiler,
        `
        /**
         * This normally fatal
         * @param ""
         */
       declare function doSomething() : Promise<number>;`
      );

      expect(actual.trim()).toHaveLength(0);
    });

    test("Should handle unusual characters in comments", async () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `
    foo();
    /**
     * Here are type brackets: Map<string, integer>
     * 
     * Here are braces: { value: 1 }
     * 
     * Here are single quotes: "This is a string"
     * 
     * Here are double quotes: 'Also a string'
     * 
     * @param foo - but this function has no params!
     * @param foo this one is missing a dash
     * 
     * @imaginary
     */
    declare function foo(): Promise<string>;`,
        mock
      );
      expect(mock).toHaveBeenCalled();
    });

    test("Should fail for truly breaking syntax in imaginary functions", async () => {
      expect(() => {
        const actual = compile(
          compiler,
          `
    foo();
    /**
     * @param "" - this will probably confuse the execution of the test
     *
     * @imaginary
     */
    declare function foo(): Promise<string>;`
        );
      }).toThrowError("Syntax error tsdoc");
    });

    // TODO: enable when Map rehydration is ready
    test.skip("Should support Map", async () => {
      const mock: jest.Mock<CallImaginaryFunction> = jest.fn();
      compileAndRunWithCallImaginaryMock(
        compiler,
        `
    foo();
    /**
     *
     * @imaginary
     */
    declare function foo(): Promise<Map<string, number>>;`,
        mock
      );
      expect(mock).toHaveBeenCalled();
    });
  });
}
