import {
  extractServiceParameters,
  isImaginaryCommentBlock,
  makeTSDocParser,
  parseImaginaryComment,
} from "./ts-doc";

describe("extractServiceParameters", () => {
  it.each([
    {
      comment: ``,
      params: {},
    },
    {
      comment: `/** */`,
      params: {},
    },
    {
      comment: `/** 
      @openai \`{"temperature": 4}\`
      */`,
      params: {
        openai: {
          temperature: 4,
        },
      },
    },
    {
      comment: `/** 
      @openai \`{"max_tokens": 2}\`
      */`,
      params: {
        openai: {
          max_tokens: 2,
        },
      },
    },
  ])("Should extract parameters %p", ({ comment, params }) => {
    const parser = makeTSDocParser();
    const gotParams = extractServiceParameters(parser, comment);
    expect(gotParams).toEqual(params);
  });
});

describe("isImaginaryCommentBlock", () => {
  it.each([
    { comment: "", isImaginary: false },
    { comment: `/** @imaginary */`, isImaginary: true },
    {
      comment: `/** 
    @imaginary
    @badtaghere
     */`,
      isImaginary: true,
    },
  ])("should get imaginary status from %p", ({ comment, isImaginary }) => {
    const parser = makeTSDocParser();
    const parsed = parser.parseString(comment);
    expect(isImaginaryCommentBlock(parsed)).toEqual(isImaginary);
  });
});

describe("parseImaginaryComment finds @imaginary", () => {
  it.each([
    { comment: "", isImaginary: false },
    { comment: `/** @imaginary */`, isImaginary: true },
    {
      comment: `/** 
    @imaginary
    @badtaghere
     */`,
      isImaginary: true,
    },
  ])("should get imaginary status from %p", ({ comment, isImaginary }) => {
    expect(parseImaginaryComment(comment) !== null).toEqual(isImaginary);
  });
});

describe("parseImaginaryComment can get service parameters", () => {
  it.each([
    {
      comment: `/** @imaginary */`,
      params: {},
    },
    {
      comment: `/** 
      @imaginary
      @openai \`{"temperature": 4}\`
      */`,
      params: {
        openai: {
          temperature: 4,
        },
      },
    },
    {
      comment: `/** 
      @imaginary
      @openai \`{"max_tokens": 2}\`
      */`,
      params: {
        openai: {
          max_tokens: 2,
        },
      },
    },
  ])("Should extract parameters %p", ({ comment, params }) => {
    expect(parseImaginaryComment(comment)?.getServiceParameters()).toEqual(
      params
    );
  });
});

describe("parseImaginaryComment can remove service parameters", () => {
  it.each([
    {
      comment: `/** 
      @openai \`{"temperature": 0.7, "model": "gpt-4"}\`
      * @imaginary
      */`,
      remove: ["openai", "temperature"],
      result: `/**
 * @openai
 *
 * \`{"model":"gpt-4"}\`
 *
 * @imaginary
 */`,
    },
    {
      comment: `/** 
      @openai \`{"temperature": 0.7}\`
      * @imaginary
      */`,
      remove: ["openai", "temperature"],
      result: `/**
 * @imaginary
 */`,
    },
  ])("Should extract parameters %p", ({ comment, remove, result }) => {
    const imaginaryComment = parseImaginaryComment(comment);

    expect(
      imaginaryComment
        ?.removeSingleServiceParameter(remove[0], remove[1])
        .getText()
    ).toEqual(result);
  });
});
