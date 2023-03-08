"use client";
import { JSONSchema7 } from "json-schema";

export type ParameterValidation = {
  type: "warning" | "error";
  message: string;
};

export interface Scenario {
  id: string;
  hash: string | null;
  name: string;
  code: string;

  results: Record<string, TestResult>;
}
export interface TestResult {
  id: string;
  name: string;
  lastValidCode: string;
  lastValidSchema?: JSONSchema7;
  testCaseId: string;

  lastResult?:
    | { type: "response"; response: any }
    | { type: "error"; error: string }; // JSON?

  resultDirty?: boolean; // whether or not lastResult needs to be checked
}

export interface TestCase {
  id: string;
  name: string;
  parameterValues: Record<string, string>;
}
