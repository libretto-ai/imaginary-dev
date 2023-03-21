import { describe } from "@jest/globals";
import { getVariablesFromPrompt, replaceVariablesInPrompt } from "./prompt";

describe("getVariablesFromPrompt", () => {
  test("basic replacement", () => {
    const vars = getVariablesFromPrompt({
      text: "hello {{world}}",
    });
    expect(vars).toEqual(["world"]);
  });
});

describe("replaceVariablesInPrompt", () => {
  test("should replace variables", () => {
    const newPrompt = replaceVariablesInPrompt("hello {{world}}", {
      world: "friends",
    });
    expect(newPrompt).toEqual({ prompt: 'hello "friends"' });
  });

  test('Should split prompt on "completion" keyword', () => {
    const newPrompt = replaceVariablesInPrompt(
      "The {{completion}} is complete",
      { completion: "not included" }
    );
    expect(newPrompt).toEqual({ prompt: "The ", suffix: " is complete" });
  });

  test("should throw on missing variables", () => {
    expect(() => {
      const newPrompt = replaceVariablesInPrompt(
        "The {{missingVariable}} is missing",
        { unrelatedVariable: "is present" }
      );
    }).toThrow("missingVariable is missing");
  });
});
