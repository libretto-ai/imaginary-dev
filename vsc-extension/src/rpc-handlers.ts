import { callImaginaryFunction } from "@imaginary-dev/runtime";
import {
  getImaginaryTsDocComments,
  tsNodeToJsonSchema,
} from "@imaginary-dev/typescript-transformer";
import { Configuration, OpenAIApi } from "openai";
import ts from "typescript";
import * as vscode from "vscode";
import {
  FunctionTestCase,
  SourceFileTestCaseMap,
} from "../src-shared/source-info";
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
import { SourceFileMap } from "./util/ts-source";
import { TypedMap } from "./util/types";

/**
 * This function takes in a TypeScript function declaration and gives one good set of test parameters for that
 * functions. For the function passed in, it returns 1 full set of test parameters. The set of test data
 * has a value for each of the function's parameters (although the values can sometimes be null or undefined,
 * if the function specification allows it). Each of the arguments it gives is a JSON-compliant object or
 * primitive value, and it is compliant with the TypeScript types in the function declaration. It uses the
 * function name, the function comment, and the function parameter names to come up with good test cases.
 *
 * The set of test inputs should be a simple JSON object, where the parameter
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
 * @returns a single set of test parameters. The set of test parameters is an object where the object
 * properties are the parameter names.
 *
 * @imaginary
 * @openai `{"model": "gpt-4", "temperature": 0.5}`
 */
declare function generateTestParametersForTypeScriptFunction(
  functionDeclaration: string,
  existingTestParameters: Array<Record<string, any>>
): Promise<Record<string, any>>;

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
interface TestLocation {
  fileName: string;
  functionName: string;
  testCaseIndex: number;
}

const OPENAI_API_SECRET_KEY = "openaiApiKey";
export function makeRpcHandlers(
  extensionContext: vscode.ExtensionContext,
  state: TypedMap<State>,
  extensionLocalState: TypedMap<ExtensionHostState>
) {
  const secretsProxy = new SecretsProxy(extensionContext);

  return {
    async showErrorMessage({ message }: { message: string }) {
      await vscode.window.showErrorMessage(message);
    },

    async hasAccessToModel({
      modelName,
    }: {
      modelName: string;
    }): Promise<boolean> {
      const apiKey = await secretsProxy.getSecret(OPENAI_API_SECRET_KEY);
      if (!apiKey) {
        return false;
      }

      const openai = new OpenAIApi(new Configuration({ apiKey }));
      try {
        const response = await openai.retrieveModel(modelName);

        return !!response?.data?.id;
      } catch (e) {
        // often the API gives a 404 that in turn throws when it's a model you don't have.
        return false;
      }
    },

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

    async runTestCase({ fileName, functionName, testCaseIndex }: TestLocation) {
      console.log(
        `runTestCase: ${fileName}, ${functionName}, ${testCaseIndex}`
      );
      const testCases = state.get("testCases");
      const nativeSources = extensionLocalState.get("nativeSources");
      const { functionInfo, testCase } = extractTestCaseContext(
        testCases,
        fileName,
        functionName,
        testCaseIndex,
        nativeSources
      );

      const apiKey = await secretsProxy.getSecret(OPENAI_API_SECRET_KEY);
      if (!apiKey) {
        return;
      }
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
    }: TestLocation) {
      const testCases = state.get("testCases");
      const nativeSources = extensionLocalState.get("nativeSources");
      const { testCase } = extractTestCaseContext(
        testCases,
        fileName,
        functionName,
        testCaseIndex,
        nativeSources
      );

      if (testCase.hasCustomName) {
        return;
      }

      const imaginaryFunctionDefinition = generateFunctionDefinition(
        nativeSources,
        fileName,
        functionName
      );
      const testName = await generateTestCaseName(
        imaginaryFunctionDefinition,
        testCase.inputs
      );

      updateTestName(state, fileName, functionName, testCaseIndex, testName);
      return testName;
    },
    async renameTest({
      fileName,
      functionName,
      testCaseIndex,
      newTestName,
    }: TestLocation & { newTestName?: string }) {
      const newName = await vscode.window.showInputBox({
        prompt: "Enter new name",
        value: newTestName,
      });
      if (newName === undefined) {
        return;
      }
      updateTestName(state, fileName, functionName, testCaseIndex, newName);
    },
  };
}

function updateTestName(
  state: TypedMap<State>,
  fileName: string,
  functionName: string,
  testCaseIndex: number,
  newTestName: string
) {
  const testCases = state.get("testCases");
  state.set(
    "testCases",
    updateSourceFileTestCase(
      testCases,
      fileName,
      functionName,
      testCaseIndex,
      (prevTestCase) => ({
        ...blankTestCase,
        ...prevTestCase,
        hasCustomName: true,
        name: newTestName,
      })
    )
  );
}

function extractTestCaseContext(
  testCases: SourceFileTestCaseMap,
  fileName: string,
  functionName: string,
  testCaseIndex: number,
  nativeSources: SourceFileMap
) {
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
    nativeSources,
    fileName,
    functionName
  );
  if (!functionInfo) {
    const message = `Unable to find function declaration for ${functionName} in ${fileName}`;
    console.error(message);
    throw new Error(message);
  }
  return { functionInfo, testCase };
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

/**
 * Generic type for RPC interface - can be consumed elsewhere to make typesafe
 * callers */
export type ExtensionRpcInterface = ReturnType<typeof makeRpcHandlers>;
