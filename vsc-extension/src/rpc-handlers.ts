import { callImaginaryFunction } from "@imaginary-dev/runtime";
import { getImaginaryTsDocComments } from "@imaginary-dev/typescript-transformer";
import { JSONSchema7 } from "json-schema";
import ts from "typescript";
import * as vscode from "vscode";
import { findTestCases } from "../src-shared/testcases";
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

      // super hack while developing
      const returnSchema: JSONSchema7 = { type: "string" };
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
        return result;
      } catch (ex) {
        console.error(ex);
        throw ex;
      }
    },
  };
}
/** This just gets all the types as `any`, since we do not have a ts.TypeChecker available */
function hackyGetParamTypes(
  fn: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile
) {
  const params = fn.parameters
    .map((param) => param.name)
    .filter((param): param is ts.Identifier => {
      if (!ts.isIdentifier(param)) {
        console.error("failure 3", param);

        throw new Error(`Parameter ${param} must be a named parameter`);
      }
      return true;
    })
    .map((paramName) => ({ name: paramName.getText(sourceFile) }));
  return params;
}
