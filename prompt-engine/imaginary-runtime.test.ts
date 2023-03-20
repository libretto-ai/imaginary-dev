import { callImaginaryFunction } from "./imaginary-runtime";
import * as promptOpenai from "./prompt-openai-completion";

jest.mock("./prompt-openai");

describe("callImaginaryFunction", () => {
  const runMock = jest.mocked(promptOpenai.runPromptWithRetry);
  test("should handle string result", async () => {
    runMock.mockResolvedValue({ text: 'mocked response string"}' });
    const result = await callImaginaryFunction(
      `/** emojify function
      * @imaginary */`,
      "emojify",
      [{ name: "input", type: { type: "string" } }],
      { type: "string" },
      { input: "Emojify this" }
    );

    expect(result).toEqual("mocked response string");
  });
  test("should handle numeric result", async () => {
    runMock.mockResolvedValue({ text: "17}" });
    const result = await callImaginaryFunction(
      `/** count
      * @imaginary */`,
      "count",
      [{ name: "input", type: { type: "string" } }],
      { type: "number" },
      { input: "count this" }
    );

    expect(result).toEqual(17);
  });
  test("should handle object result", async () => {
    runMock.mockResolvedValue({ text: 'obj: "value"}' });
    const result = await callImaginaryFunction(
      `/** count
      * @imaginary */`,
      "count",
      [{ name: "input", type: { type: "string" } }],
      {
        type: "object",
        properties: {
          obj: { type: "string" },
        },
      },
      { input: "count this" }
    );

    expect(result).toEqual({ obj: "value" });
  });
  test("should handle array results", async () => {
    runMock.mockResolvedValue({ text: "1,2,3]" });
    const result = await callImaginaryFunction(
      `/** count
      * @imaginary */`,
      "count",
      [{ name: "input", type: { type: "string" } }],
      {
        type: "array",
        items: {
          type: "number",
        },
      },
      { input: "count this" }
    );

    expect(result).toEqual([1, 2, 3]);
  });

  test("should handle array of object results", async () => {
    runMock.mockResolvedValue({ text: '"obj": "value"}, {"obj": "value" }]' });
    const result = await callImaginaryFunction(
      `/** count
      * @imaginary */`,
      "count",
      [{ name: "input", type: { type: "string" } }],
      {
        type: "array",
        items: {
          type: "object",
          properties: {
            obj: { type: "string" },
          },
        },
      },
      { input: "count this" }
    );

    expect(result).toEqual([{ obj: "value" }, { obj: "value" }]);
  });

  test("should handle boolean results", async () => {
    runMock.mockResolvedValue({ text: "true}" });
    const result = await callImaginaryFunction(
      `/** count
      * @imaginary */`,
      "count",
      [{ name: "input", type: { type: "string" } }],
      {
        type: "boolean",
      },
      { input: "count this" }
    );

    expect(result).toEqual(true);
  });
  test("should handle null results", async () => {
    runMock.mockResolvedValue({ text: "null}" });
    const result = await callImaginaryFunction(
      `/** count
      * @imaginary */`,
      "count",
      [{ name: "input", type: { type: "string" } }],
      {
        type: "null",
      },
      { input: "count this" }
    );

    // TODO: if the above is unparsable, this will also return null - really we
    // would throw here if openai returns the wrong value
    expect(result).toEqual(null);
  });
  test("should throw with bad leading comment", () => {
    expect(async () => {
      await callImaginaryFunction(
        "test",
        "emojify",
        [{ name: "input", type: { type: "string" } }],
        { type: "string" },
        { input: "Emojify this" }
      );
    }).rejects.toThrow("comment must start with '/**'");
  });
  test("should throw with bad trailing comment", () => {
    expect(async () => {
      await callImaginaryFunction(
        "/** test",
        "emojify",
        [{ name: "input", type: { type: "string" } }],
        { type: "string" },
        { input: "Emojify this" }
      );
    }).rejects.toThrow("comment must end with '*/'");
  });
  test("should fail on bad response", async () => {
    runMock.mockResolvedValue({ text: "mocked response string" });
    const result = await callImaginaryFunction(
      `/** emojify function
      * @imaginary */`,
      "emojify",
      [{ name: "input", type: { type: "string" } }],
      { type: "string" },
      { input: "Emojify this" }
    );

    expect(result).toEqual(null);
  });
});
