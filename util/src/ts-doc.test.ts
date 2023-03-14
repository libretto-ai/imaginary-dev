import {
  extractServiceParameters,
  isImaginaryCommentBlock,
  makeTSDocParser,
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
