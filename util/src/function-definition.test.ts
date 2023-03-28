// Import the required libraries and functions
import { JSONSchema7 } from "json-schema";
import {
  hashFunctionDefinition,
  ImaginaryFunctionDefinition,
} from "./function-definition"; // Replace with the correct module path
// Test the hashFunctionDefinition function
describe("hashFunctionDefinition", () => {
  it("should return the same hash for identical ImaginaryFunctionDefinitions", () => {
    // Create two identical ImaginaryFunctionDefinition objects
    const definition1: ImaginaryFunctionDefinition = {
      funcName: "testFunc",
      funcComment: "This is a test function",
      parameterTypes: [
        { name: "param1", type: { type: "string" } as JSONSchema7 },
      ],
      returnSchema: { type: "boolean" } as JSONSchema7,
      isImaginary: true,
      serviceParameters: {
        openai: { temperature: 0.8 },
      },
    };

    const definition2: ImaginaryFunctionDefinition = {
      funcName: "testFunc",
      funcComment: "This is a test function",
      parameterTypes: [
        { name: "param1", type: { type: "string" } as JSONSchema7 },
      ],
      returnSchema: { type: "boolean" } as JSONSchema7,
      isImaginary: true,
      serviceParameters: {
        openai: { temperature: 0.8 },
      },
    };

    // Calculate the hashes for both objects
    const hash1 = hashFunctionDefinition(definition1);
    const hash2 = hashFunctionDefinition(definition2);

    // Expect the hashes to be the same
    expect(hash1).toEqual(hash2);
  });

  it("should return different hashes for different ImaginaryFunctionDefinitions", () => {
    // Create two different ImaginaryFunctionDefinition objects
    const definition1: ImaginaryFunctionDefinition = {
      funcName: "testFunc1",
      funcComment: "This is a test function",
      parameterTypes: [
        { name: "param1", type: { type: "string" } as JSONSchema7 },
      ],
      returnSchema: { type: "boolean" } as JSONSchema7,
      isImaginary: true,
      serviceParameters: {
        openai: { temperature: 0.8 },
      },
    };

    const definition2: ImaginaryFunctionDefinition = {
      funcName: "testFunc2",
      funcComment: "This is another test function",
      parameterTypes: [
        { name: "param1", type: { type: "number" } as JSONSchema7 },
      ],
      returnSchema: { type: "boolean" } as JSONSchema7,
      isImaginary: true,
      serviceParameters: {
        openai: { temperature: 0.9 },
      },
    };

    // Calculate the hashes for both objects
    const hash1 = hashFunctionDefinition(definition1);
    const hash2 = hashFunctionDefinition(definition2);

    // Expect the hashes to be different
    expect(hash1).not.toEqual(hash2);
  });
});
