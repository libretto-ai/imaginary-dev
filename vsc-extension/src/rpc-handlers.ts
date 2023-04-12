import { callImaginaryFunction } from "@imaginary-dev/runtime";
import { getImaginaryTsDocComments } from "@imaginary-dev/typescript-transformer";
import { JSONSchema7 } from "json-schema";
import ts from "typescript";
import * as vscode from "vscode";
import { findTestCases } from "../src-shared/testcases";
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
        console.error("failure 1", testCases, " from ", fileName, functionName);
        throw new Error(
          `Trying to run test case #${testCaseIndex} with ${
            testCases?.testCases.length ?? 0
          } test cases`
        );
      }
      const testCase = testCases.testCases[testCaseIndex];
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
      const { fn, sourceFile } = functionInfo;
      console.log("getting comments from ", fn, sourceFile);
      const funcComment = getImaginaryTsDocComments(fn, sourceFile)[0];

      console.log("getting api key");
      const apiKey = await secretsProxy.getSecret(SECRET_OPENAI_API_KEY);

      console.log("getting params from ", fn);
      const parameterTypes = hackyGetParamTypes(fn, sourceFile);

      // super hack while developing
      const returnSchema: JSONSchema7 = { type: "string" };
      const paramValues = Object.fromEntries(
        parameterTypes.map(({ name }) => [name, testCase.inputs[name]])
      );
      console.log("about to run...");
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
        console.error("Got error: ", ex);
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
