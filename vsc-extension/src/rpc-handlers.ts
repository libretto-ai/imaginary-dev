import { callImaginaryFunction } from "@imaginary-dev/runtime";
import {
  getImaginaryTsDocComments,
  tsNodeToJsonSchema,
} from "@imaginary-dev/typescript-transformer";
import ts from "typescript";
import { FunctionTestCase } from "vsc-extension/src-shared/source-info";
import * as vscode from "vscode";
import {
  blankTestCase,
  findTestCase,
  updateSourceFileTestCase,
  updateSourceFileTestOutput,
} from "../src-shared/testcases";
import { ExtensionHostState } from "./util/extension-state";
import { SecretsProxy } from "./util/secrets";
import { findNativeFunction, generateFunctionDefinition } from "./util/source";
import { State } from "./util/state";
import { TypedMap } from "./util/types";

/**
 * This function takes in a TypeScript function declaration and gives lists of good test data for those
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
 * The function is creative with the test inputs that it creates. It will come up with some easy inputs
 * but others that will be tricky or difficult for the function to understand. The test inputs will have
 * a bit of randomness introduced and will be meaningfully different from each other.
 *
 * The function also takes in an array of test inputs that already exist for the function. The return
 * value test inputs should not be similar to the ones that already exist.
 *
 * @param functionDeclaration - a TypeScript function declaration for which to make test parameters
 * @param existingTestParameters - an array of test parameters that already exist for the function being
 * passed in. none of the result should be similar to these.
 *
 * @returns an array of 5 sets of test parameters. each set of test parameters is an object where the object
 * properties are the parameter names.
 *
 * @imaginary
 * @openai `{"model": "gpt-4", "temperature": 0.5}`
 */
declare function generateTestParametersForTypeScriptFunction(
  functionDeclaration: string,
  existingTestParameters: Array<Record<string, any>>
): Promise<Record<string, any>[]>;

/**
 * This function takes in a TypeScript function declaration as a string, and an
 * example set of parameters that would be passed to that function. This
 * combination of function and parameters is called a test case. This function
 * returns a name for that test case.
 *
 * The test case name should be human-readable, descriptive, but terse, no more than 4 words. There
 * will be many test cases for this function, so the name should be much more
 * descriptive of the paramters than the function itself.
 *
 * For test cases with a single, primitive parameter, the name should just be
 * the value of that parameter as a english, human-readable string of no more than 4 words.
 *
 * For example, with a function with one parameter like:
 * ```
 * function guessAName(location: string);
 * ```
 * and parameters like this:
 * ```
 *  { location: "Spain" }
 * ```
 * A good name for this case would be `Spain`.
 *
 * For a more complex example, with a function like:
 * ```
 * function runQuery(tableName: string, queryString: string);
 * ```
 * and parameters like this:
 * ```
 *  { tableName: "people", queryString: "fred flinstone" }
 * ```
 *
 * A good name for this case would be `people / fred`
 *
 * @imaginary
 */
declare function generateTestCaseName(
  functionDeclaration: string,
  parameters: Record<string, any>
): Promise<string>;

const OPENAI_API_SECRET_KEY = "openaiApiKey";
export function makeRpcHandlers(
  extensionContext: vscode.ExtensionContext,
  state: TypedMap<State>,
  extensionLocalState: TypedMap<ExtensionHostState>
) {
  const secretsProxy = new SecretsProxy(extensionContext);

  return {
    async generateTestParametersForTypeScriptFunction({
      fileName,
      functionName,
      existingTestInputs,
    }: {
      fileName: string;
      functionName: string;
      existingTestInputs: Array<Record<string, any>>;
    }) {
      const nativeSources = extensionLocalState.get("nativeSources");
      const imaginaryFunctionDefinition = generateFunctionDefinition(
        nativeSources,
        fileName,
        functionName
      );
      return generateTestParametersForTypeScriptFunction(
        imaginaryFunctionDefinition,
        existingTestInputs
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
        `runTestCase: ${fileName}, ${functionName}, ${testCaseIndex}`
      );
      const testCases = state.get("testCases");
      const testCase = findTestCase(
        testCases,
        fileName,
        functionName,
        testCaseIndex
      );
      if (!testCase) {
        const message = `Could not find test case #${testCaseIndex} for ${fileName} ${functionName}`;
        console.error(message);
        throw new Error(message);
      }
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

      const apiKey = await secretsProxy.getSecret(OPENAI_API_SECRET_KEY);
      try {
        const { funcComment, parameterTypes, returnSchema, paramValues } =
          extractCallParameters(functionInfo, testCase);
        const result = await callImaginaryFunction(
          funcComment,
          functionName,
          parameterTypes,
          returnSchema,
          paramValues,
          { openai: { apiConfig: { apiKey } } }
        );

        updateTestRunState(
          state,
          fileName,
          functionName,
          testCaseIndex,
          result
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

    async guessTestName({
      fileName,
      functionName,
      testCaseIndex,
    }: {
      fileName: string;
      functionName: string;
      testCaseIndex: number;
    }) {
      const functionInfo = findNativeFunction(
        extensionLocalState.get("nativeSources"),
        fileName,
        functionName
      );
      const testCases = state.get("testCases");
      const testCase = findTestCase(
        testCases,
        fileName,
        functionName,
        testCaseIndex
      );
      if (!testCase) {
        const message = `Could not find test case #${testCaseIndex} for ${fileName} ${functionName}`;
        console.error(message);
        throw new Error(message);
      }

      if (!functionInfo) {
        console.error(
          "failure 2",
          `Unable to find function declaration for ${functionName} in ${fileName}`
        );
        throw new Error(
          `Unable to find function declaration for ${functionName} in ${fileName}`
        );
      }

      const imaginaryFunctionDefinition = generateFunctionDefinition(
        extensionLocalState.get("nativeSources"),
        fileName,
        functionName
      );
      const testName = await generateTestCaseName(
        imaginaryFunctionDefinition,
        testCase.inputs
      );
      console.log("got test name = ", testName);
      if (!testCase.hasCustomName) {
        state.set(
          "testCases",
          updateSourceFileTestCase(
            state.get("testCases"),
            fileName,
            functionName,
            testCaseIndex,
            (prevTestCase) => ({
              ...blankTestCase,
              ...prevTestCase,
              hasCustomName: true,
              name: testName,
            })
          )
        );
      }
      return testName;
    },
  };
}

function updateTestRunState(
  state: TypedMap<State>,
  fileName: string,
  functionName: string,
  testCaseIndex: number,
  result: any
) {
  state.set(
    "latestTestOutput",
    updateSourceFileTestOutput(
      state.get("latestTestOutput"),
      fileName,
      functionName,
      testCaseIndex,
      (output) => ({
        ...output,
        output: result,
        lastRun: new Date().toISOString(),
      })
    )
  );
}

function extractCallParameters(
  functionInfo: { fn: ts.FunctionDeclaration; sourceFile: ts.SourceFile },
  testCase: FunctionTestCase
) {
  const { fn, sourceFile } = functionInfo;
  const funcComment = getImaginaryTsDocComments(fn, sourceFile)[0];
  const parameterTypes = getParamTypes(fn, sourceFile);
  if (!fn.type) {
    const message = `Missing type in ${fn.name?.getText(sourceFile)}`;
    console.error(message);
    throw new Error(message);
  }

  const returnSchema = tsNodeToJsonSchema(fn.type, sourceFile, true);
  const paramValues = Object.fromEntries(
    parameterTypes.map(({ name }) => [name, testCase.inputs[name]])
  );
  return { funcComment, parameterTypes, returnSchema, paramValues };
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
