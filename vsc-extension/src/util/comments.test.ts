import { FunctionTestCase, TestOutput } from "../../src-shared/source-info";
import { addExampleToComment } from "./comments";

describe("addExampleToComment", () => {
  it("should add an example to a comment", () => {
    const comment = `
      This is a test function.
    `;
    const testInput: FunctionTestCase = {
      name: "test",
      inputs: { a: 1, b: 2 },
    };
    const testOutput: TestOutput = {
      output: 3,
      lastRun: "",
    };

    const newComment = addExampleToComment(comment, testInput, testOutput);

    expect(newComment).toContain("@example");
    expect(newComment).toContain("Input:");
    expect(newComment).toContain(' * {\n *   "a": 1,\n *   "b": 2\n * }');
    expect(newComment).toContain("Output:");
    expect(newComment).toContain("3");
  });

  it("should handle an empty comment", () => {
    const comment = "";
    const testInput: FunctionTestCase = {
      name: "test",
      inputs: { a: 1, b: 2 },
    };
    const testOutput: TestOutput = {
      output: 3,
      lastRun: "",
    };

    const newComment = addExampleToComment(comment, testInput, testOutput);

    expect(newComment).toContain("@example");
    expect(newComment).toContain("Input:");
    expect(newComment).toContain(' * {\n *   "a": 1,\n *   "b": 2\n * }');
    expect(newComment).toContain("Output:");
    expect(newComment).toContain("3");
  });

  it("should handle a comment with existing examples", () => {
    const comment = `/**
      This is a test function.
      
      @example
      This is an example.
      */
    `;
    const testInput: FunctionTestCase = {
      name: "test",
      inputs: { a: 1, b: 2 },
    };
    const testOutput: TestOutput = {
      lastRun: "",
      output: 3,
    };

    const newComment = addExampleToComment(comment, testInput, testOutput);

    expect(newComment).toContain("@example");
    expect(newComment).toContain("This is an example.");
    expect(newComment).toContain("Input:");
    expect(newComment).toContain(' * {\n *   "a": 1,\n *   "b": 2\n * }');
    expect(newComment).toContain("Output:");
    expect(newComment).toContain("3");
  });
});
