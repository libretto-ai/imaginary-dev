import { callImaginaryFunction } from "./imaginary-runtime";
import * as promptOpenai from "./prompt-openai";

jest.mock("./prompt-openai");

describe("callImaginaryFunction", () => {
  test.skip("should throw with bad comment", () => {
    expect(async () => {
      await callImaginaryFunction(
        "test",
        "emojify",
        [{ name: "input", type: { type: "string" } }],
        { type: "string" },
        { input: "Emojify this" }
      );
    }).rejects.toThrow("foo");
  });
  const runMock = jest.mocked(promptOpenai.runPromptWithRetry);
  test("should handle correctly mocked result", async () => {
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
});
