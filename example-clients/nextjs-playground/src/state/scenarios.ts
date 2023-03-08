"use client";
import { ParameterValidation, Scenario, TestCase, TestResult } from "@/types";
import { getImaginaryFunctionDefinitions } from "@/util/babel";
import {
  hashFunctionDefinition,
  ImaginaryFunctionDefinition,
} from "@imaginary-dev/util";
import { JSONSchema7 } from "json-schema";
import { atom, DefaultValue, selector, SetterOrUpdater } from "recoil";
import { v4 as uuidv4 } from "uuid";

export function makeScenario(id: string, name: string, code: string): Scenario {
  const definitions = getImaginaryFunctionDefinitions(code);
  const hash =
    definitions.length === 1 ? hashFunctionDefinition(definitions[0]) : null;
  return {
    code,
    hash,
    id,
    name,
    results: {},
  };
}

export function cloneScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    // clear out previous result
    results: {},
  };
}

const EMPTY_SCENARIO: Scenario = {
  code: "",
  id: "prompt1",
  name: "Prompt #1",
  hash: null,
  results: {},
};

export function validateParameter(
  parameterType: JSONSchema7 & { is_required?: boolean },
  parameterValue: string
): ParameterValidation | null {
  switch (parameterType.type) {
    case "string":
      return null;
    case "number":
      if (!parameterValue.match(/[0-9]+/) && parameterType.is_required) {
        return { type: "error", message: "Needs to be a number." };
      }
      return null;
    case "boolean":
      if (
        parameterValue === "true" ||
        parameterValue === "false" ||
        (parameterValue === "" && !parameterType.is_required)
      )
        return null;
      return {
        type: "error",
        message: "Parameter needs to be a boolean value.",
      };

    default:
      if (parameterType.anyOf) {
        return {
          type: "error",
          message: "Cannot edit union types",
        };
      }
      try {
        JSON.parse(parameterValue);
        return null;
      } catch (e: any) {
        return {
          type: "error",
          message: `Cannot be parsed as JSON: ${e.message}`,
        };
      }
  }
}

export function createResult(testCaseId: string, name: string): TestResult {
  return {
    id: uuidv4(),
    name,
    lastValidCode: "",
    testCaseId,
  };
}

export function createTestCase(name: string): TestCase {
  return {
    id: uuidv4(),
    name,
    parameterValues: {},
  };
}
export type DefinitionsState =
  | {
      definition: ImaginaryFunctionDefinition;
      error?: undefined;
    }
  | {
      error: Error;
    };

export const runTestCase = async (
  updateResult: SetterOrUpdater<TestResult>,
  parameterValues: Record<string, any>,
  setIsBusy: SetterOrUpdater<boolean>,
  definitionState: DefinitionsState,
  bypassCache: boolean
) => {
  // clear the last response or error.
  updateResult((prevResult) => ({ ...prevResult, lastResult: undefined }));

  if (definitionState.error) {
    const { error } = definitionState;
    updateResult((prevResult) => ({
      ...prevResult,
      lastResult: { type: "error", error: error.message },
    }));
    return;
  }

  setIsBusy(true);
  try {
    const response = await fetch(
      `/api/runImaginaryFunction?definition=${encodeURIComponent(
        JSON.stringify(definitionState.definition)
      )}&parameters=${encodeURIComponent(JSON.stringify(parameterValues))}`,
      { cache: bypassCache ? "no-store" : undefined }
    );

    const lastResult = await response.json();
    updateResult((prevResult) => ({
      ...prevResult,
      lastResult,
    }));
  } catch (ex: any) {
    updateResult((prevResult) => ({
      ...prevResult,
      lastResult: { type: "error", error: ex.message },
    }));
  } finally {
    setIsBusy(false);
  }
};

export const isBusyState = atom<boolean>({
  key: "isBusy",
  default: false,
});

export const imaginaryFunctionDefinitionsState = selector<DefinitionsState>({
  key: "imaginaryFunctionDefinitions",
  get: ({ get }) => {
    const scenario = get(workingScenarioState);
    try {
      const definitions = getImaginaryFunctionDefinitions(scenario.code);
      if (definitions.length > 1) {
        return {
          error: new Error(
            `Too many imaginary function definitions (${definitions.length})`
          ),
        };
      }
      if (definitions.length < 1) {
        return {
          error: new Error(`No imaginary function definitions`),
        };
      }
      return { definition: definitions[0] };
    } catch (ex) {
      return { error: ex as Error };
    }
  },
});

export const workingScenarioState = atom<Scenario>({
  key: "working-scenario",
  default: EMPTY_SCENARIO,
});

export const testCasesState = atom<TestCase[]>({
  key: "test-cases",
  default: [createTestCase("Test case")],
});

export const activeTestCaseIndexState = atom({
  key: "activeTestCaseIndexState",
  default: 0,
});

export const activeTestCaseState = selector({
  key: "active-test-case",
  get: ({ get }) => {
    const testCaseIndex = get(activeTestCaseIndexState);
    const testCases = get(testCasesState);
    const testCase = testCases[testCaseIndex];
    if (!testCase) {
      return testCases[0];
    }
    return testCase;
  },
  set: ({ set, get }, newTestCase) => {
    const testCaseIndex = get(activeTestCaseIndexState);
    const testCases = get(testCasesState);
    set(
      testCasesState,
      testCases.map((testCase, index) => {
        if (index === testCaseIndex) {
          return newTestCase instanceof DefaultValue
            ? createTestCase("New test")
            : newTestCase;
        }
        return testCase;
      })
    );
  },
});
export const activeResultState = selector({
  key: "activeResultState",
  get: ({ get }) => {
    const scenario = get(workingScenarioState);
    const testCase = get(activeTestCaseState);
    const testResult = scenario.results[testCase.id];
    return testResult;
  },
  set: ({ set, get }, newResult) => {
    const scenario = get(workingScenarioState);
    const testCase = get(activeTestCaseState);
    set(workingScenarioState, {
      ...scenario,
      results: {
        ...scenario.results,
        [testCase.id]:
          newResult instanceof DefaultValue
            ? createResult(testCase.id, "test result")
            : newResult,
      },
    });
  },
});
