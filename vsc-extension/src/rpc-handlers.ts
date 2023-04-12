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
import { SecretsProxy, SECRET_OPENAI_API_KEY } from "./util/secrets";
import { findNativeFunction } from "./util/source";
import { State } from "./util/state";
import { TypedMap } from "./util/types";
import { findMatchingFunction } from "../src-shared/source-info";

// THIS IS AN EXAMPLE FUNCTION TO SHOW HOW IMAGINARY FUNCTIONS WORK
/**
 * This function returns a random animal that you would see at the zoo.
 *
 * @returns the name of a type of zoo animal
 * @imaginary
 */
declare function getRandomZooAnimal(): Promise<string>;

/**
 * This function takes in TypeScript function declarations and gives lists of good test data for those
 * functions. For each function passed in, it returns 5 full sets of test parameters. Each set of test data
 * has a value for each of the function's parameters (although the values can sometimes be null or undefined,
 * if the function specification allows it). Each of the arguments it gives is a JSON-compliant object or
 * primitive value, and it is compliant with the TypeScript types in the function declaration. It uses the
 * function name, the function comment, and the function parameter names to come up with good test cases.
 *
 * Each set of test inputs should be a simple JSON object, where the parameter
 * names are the keys in the object.
 *
 * If there is a useful, human-readable name for a test case, it is added as an element of the object with
 * the name __testName.
 *
 * The function is creative with the test inputs. It will come up with some easy inputs but others that
 *  will be tricky or difficult for the function to understand.
 *
 * @param functionDeclaration - a TypeScript function declaration for which to make test parameters
 * @returns an array of 5 sets of test parameters. each set of test parameters is an object where the object
 * properties are the parameter names.
 *
 * @imaginary
 * @openai `{"model": "gpt-4"}`
 */
declare function generateTestParametersForTypeScriptFunction(
  functionDeclaration: string
): Promise<Record<string, any>[]>;

const OPENAI_API_SECRET_KEY = "openaiApiKey";
export function makeRpcHandlers(
  extensionContext: vscode.ExtensionContext,
  state: TypedMap<State>,
  extensionLocalState: TypedMap<ExtensionHostState>
) {
  const secretsProxy = new SecretsProxy(extensionContext);

  return {
    getRandomZooAnimal,

    async generateTestParametersForTypeScriptFunction({
      fileName,
      functionName,
    }: {
      fileName: string;
      functionName: string;
    }) {
      const functionInfo = findNativeFunction(
        extensionLocalState.get("nativeSources"),
        fileName,
        functionName
      );
      if (!functionInfo) {
        console.error(
          "failure 2",
          `Unable to find function declaration for ${functionName} in ${fileName}`
        );
        throw new Error(
          `Unable to find function declaration for ${functionName} in ${fileName}`
        );
      }
      const { fn: fnDeclaration, sourceFile } = functionInfo;
      console.log("getting comments from ", fnDeclaration, sourceFile);
      const funcComment = getImaginaryTsDocComments(
        fnDeclaration,
        sourceFile
      )[0];

      const fn = findMatchingFunction(
        state.get("sources"),
        state.get("selectedFunction")
      );

      const imaginaryFunctionDefinition = funcComment + "\n" + fn?.declaration;
      return generateTestParametersForTypeScriptFunction(
        imaginaryFunctionDefinition
      );
    },

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
      const apiKey = await secretsProxy.getSecret(OPENAI_API_SECRET_KEY);
      try {
        console.info("getting params from ", fn);
        const parameterTypes = getParamTypes(fn, sourceFile);
        if (!fn.type) {
          const message = `Missing type in ${fn.name?.getText(sourceFile)}`;
          console.error(message);
          throw new Error(message);
        }

        const returnSchema = tsNodeToJsonSchema(fn.type, sourceFile, true);
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

    async clearApiKey() {
      await secretsProxy.clearSecret(OPENAI_API_SECRET_KEY);
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
