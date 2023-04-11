import { callImaginaryFunction } from "@imaginary-dev/runtime";
import { getImaginaryTsDocComments } from "@imaginary-dev/typescript-transformer";
import { JSONSchema7 } from "json-schema";
import ts from "typescript";
import * as vscode from "vscode";
import {
  findTestCases,
  updateSourceFileTestCaseOutput,
} from "../src-shared/testcases";
import { ExtensionHostState } from "./util/extension-state";
import { SecretInfo, SecretsProxy } from "./util/secrets";
import { findNativeFunction } from "./util/source";
import { State } from "./util/state";
import { TypedMap } from "./util/types";

const globalSecretInfo: SecretInfo[] = [
  {
    key: "openaiApiKey",
    prompt: "Enter your OpenAI API Key",
  },
];

export function makeRpcHandlers(
  extensionContext: vscode.ExtensionContext,
  state: TypedMap<State>,
  extensionLocalState: TypedMap<ExtensionHostState>
) {
  const secretsProxy = new SecretsProxy(extensionContext, globalSecretInfo);

  return {
    async runTestCase({
      fileName,
      functionName,
      testCaseIndex,
    }: {
      fileName: string;
      functionName: string;
      testCaseIndex: number;
    }) {
      console.log(
        "[Extension Host] ",
        `runTestCase: ${fileName}, ${functionName}, ${testCaseIndex}`
      );
      const testCases = findTestCases(
        state.get("testCases"),
        fileName,
        functionName
      );
      if (!testCases || testCaseIndex >= testCases.testCases.length) {
        const message = `Trying to run test case #${testCaseIndex} with ${
          testCases?.testCases.length ?? 0
        } test cases`;
        console.error(message);
        throw new Error(message);
      }
      const testCase = testCases.testCases[testCaseIndex];
      const functionInfo = findNativeFunction(
        extensionLocalState.get("nativeSources"),
        fileName,
        functionName
      );
      if (!functionInfo) {
        const message = `Unable to find function declaration for ${functionName} in ${fileName}`;
        console.error(message);
        throw new Error(message);
      }
      const { fn, sourceFile } = functionInfo;
      console.log("getting comments from ", fn, sourceFile);
      const funcComment = getImaginaryTsDocComments(fn, sourceFile)[0];

      console.log("getting api key");
      const apiKey = await secretsProxy.getSecret("openaiApiKey");

      console.log("getting params from ", fn);
      const parameterTypes = hackyGetParamTypes(fn, sourceFile);

      const returnSchema: JSONSchema7 = getHackyType(fn.type, sourceFile);
      console.log("translating return type to ", returnSchema);
      const paramValues = Object.fromEntries(
        parameterTypes.map(({ name }) => [name, testCase.inputs[name]])
      );
      try {
        const result = await callImaginaryFunction(
          funcComment,
          functionName,
          parameterTypes,
          returnSchema,
          paramValues,
          { openai: { apiConfig: { apiKey } } }
        );
        console.log("got result: ", typeof result, ": ", result);
        state.set(
          "testCases",
          updateSourceFileTestCaseOutput(
            state.get("testCases"),
            fileName,
            functionName,
            testCaseIndex,
            result
          )
        );
        return result;
      } catch (ex) {
        console.error(ex);
        throw ex;
      }
    },
  };
}

/** This is a terrible hack until we have a proper TS compiler instance ready */
function getHackyType(
  type: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile
): JSONSchema7 {
  const printer = ts.createPrinter({});
  if (!type) {
    return { type: "object" };
  }
  const promiseResult = printer.printNode(
    ts.EmitHint.Unspecified,
    type,
    sourceFile
  );
  const typeName = /Promise<(string|number|.*)>/ms.exec(promiseResult);
  const returnTypeName = typeName ? typeName[1] : "object";
  if (returnTypeName === "number" || returnTypeName === "number") {
    return { type: returnTypeName };
  }
  console.log(
    "parsing complex type ",
    promiseResult,
    " => ",
    typeName,
    " => ",
    returnTypeName
  );
  // DOES NOT WORK: no type
  if (returnTypeName.endsWith("]")) {
    return { type: "array" };
  }
  if (returnTypeName.endsWith("}")) {
    return { type: "object" };
  }
  const returnSchema: JSONSchema7 = {
    type: returnTypeName as any,
  };
  return returnSchema;
}

/** This just gets all the types as `any`, since we do not have a ts.TypeChecker available */
function hackyGetParamTypes(
  fn: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile
) {
  const params = fn.parameters
    .filter((param) => {
      if (!ts.isIdentifier(param.name)) {
        console.error("failure 3", param);

        throw new Error(`Parameter ${param} must be a named parameter`);
      }
      return true;
    })
    .map((param) => ({
      name: param.name.getText(sourceFile),
      type: getHackyType(param.type, sourceFile),
    }));
  return params;
}
