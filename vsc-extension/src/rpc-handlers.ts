import { callImaginaryFunction } from "@imaginary-dev/runtime";
import {
  getImaginaryTsDocComments,
  tsNodeToJsonSchema,
} from "@imaginary-dev/typescript-transformer";
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
      console.info("getting comments from ", fn, sourceFile);
      const funcComment = getImaginaryTsDocComments(fn, sourceFile)[0];

      console.info("getting api key");
      const apiKey = await secretsProxy.getSecret("openaiApiKey");
      try {
        console.info("getting params from ", fn);
        const parameterTypes = getParamTypes(fn, sourceFile);
        if (!fn.type) {
          const message = `Missing type in ${fn.name?.getText(sourceFile)}`;
          console.error(message);
          throw new Error(message);
        }

        const returnSchema = tsNodeToJsonSchema(fn.type, sourceFile);
        console.info("translating return type to ", returnSchema);
        const paramValues = Object.fromEntries(
          parameterTypes.map(({ name }) => [name, testCase.inputs[name]])
        );
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

/** This just gets all the types as `any`, since we do not have a ts.TypeChecker available */
function getParamTypes(fn: ts.FunctionDeclaration, sourceFile: ts.SourceFile) {
  const params = fn.parameters
    .filter((param) => {
      if (!ts.isIdentifier(param.name)) {
        throw new Error(`Parameter ${param} must be a named parameter`);
      }
      return true;
    })
    .map((param) => {
      return {
        name: param.name.getText(sourceFile),
        type: param.type
          ? tsNodeToJsonSchema(param.type, sourceFile)
          : undefined,
      };
    });
  return params;
}
