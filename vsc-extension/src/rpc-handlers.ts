import { callImaginaryFunction } from "@imaginary-dev/runtime";
import {
  getImaginaryTsDocComments,
  tsNodeToJsonSchema,
} from "@imaginary-dev/typescript-transformer";
import { makeTSDocParser, ServiceParameters } from "@imaginary-dev/util";
import * as tsdoc from "@microsoft/tsdoc";
import { Configuration, OpenAIApi } from "openai";
import ts from "typescript";
import * as vscode from "vscode";
import {
  FunctionTestCase,
  SelectedFileTestCases,
  SourceFileTestCaseMap,
  TestOutput,
} from "../src-shared/source-info";
import {
  blankTestCase,
  deleteFunctionTestCase,
  deleteTestOutput,
  findTestCase,
  findTestCases,
  updateSourceFileTestCase,
  updateSourceFileTestOutput,
} from "../src-shared/testcases";
import { HasAccessToModel } from "./has-access-enum";
import { getAbsolutePathInProject } from "./util/editor";
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
    }): Promise<HasAccessToModel> {
      const apiKey = await secretsProxy.getSecret(OPENAI_API_SECRET_KEY);
      if (!apiKey) {
        return HasAccessToModel.NO_API_KEY;
      }

      const openai = new OpenAIApi(new Configuration({ apiKey }));
      try {
        const response = await openai.retrieveModel(modelName);

        return response?.data?.id
          ? HasAccessToModel.HAS_ACCESS
          : HasAccessToModel.NO_ACCESS;
      } catch (e) {
        // often the API gives a 404 that in turn throws when it's a model you don't have.
        return HasAccessToModel.NO_ACCESS;
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
          { openai: { apiConfig: { apiKey } } } satisfies ServiceParameters
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
        const errorMessage = ex instanceof Error ? ex.message : ex;
        updateTestRunState(
          state,
          fileName,
          functionName,
          testCaseIndex,
          null,
          errorMessage
        );
        throw errorMessage;
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

    async deleteTest({ fileName, functionName, testCaseIndex }: TestLocation) {
      deleteTestCase(state, fileName, functionName, testCaseIndex);
    },

    async addToExamples({
      fileName,
      functionName,
      testCase: testInput,
      testOutput,
    }: {
      fileName: string;
      functionName: string;
      testCase: FunctionTestCase;
      testOutput: TestOutput;
    }) {
      console.log("addToExamples: ", fileName, functionName, testOutput);
      const fn = findNativeFunction(
        extensionLocalState.get("nativeSources"),
        fileName,
        functionName
      );
      if (!fn) {
        console.log("could not find file");
        return;
      }

      const wse = new vscode.WorkspaceEdit();
      const commentRange = ts.getCommentRange(fn.fn);

      const { pos, end } = commentRange;
      const commentWithFunction = fn.sourceFile.getFullText().slice(pos, end);
      // This is a hack, because getCommentRange includes the function itself?
      const comment = commentWithFunction.slice(
        0,
        commentWithFunction.lastIndexOf("*/") + 3
      );
      const commentEndPos = pos + comment.length;
      console.log("xx comment starts:", comment);
      const tsdocParser = makeTSDocParser();
      const parsedComment = tsdocParser.parseString(comment);
      const exampleTag = new tsdoc.DocBlock({
        blockTag: new tsdoc.DocBlockTag({
          configuration: tsdocParser.configuration,
          tagName: "@example",
        }),
        configuration: tsdocParser.configuration,
      });
      console.log("attempting to add a node..");
      try {
        exampleTag.content.appendNodeInParagraph(
          new tsdoc.DocPlainText({
            configuration: tsdocParser.configuration,
            text: "Input:",
          })
        );

        exampleTag.content.appendNode(
          new tsdoc.DocFencedCode({
            configuration: tsdocParser.configuration,
            language: "json",
            code: JSON.stringify(testInput.inputs, null, 2),
          })
        );
        exampleTag.content.appendNodeInParagraph(
          new tsdoc.DocPlainText({
            configuration: tsdocParser.configuration,
            text: "Output:",
          })
        );
        exampleTag.content.appendNode(
          new tsdoc.DocFencedCode({
            configuration: tsdocParser.configuration,
            language: "json",
            code: JSON.stringify(testOutput.output, null, 2),
          })
        );
      } catch (ex) {
        console.error(ex);
      }
      console.log("appended to text..");
      parsedComment.docComment.appendCustomBlock(exampleTag);
      console.log("appended to comment");
      const sb = new tsdoc.StringBuilder();

      const emit = new tsdoc.TSDocEmitter();
      const commentStart = ts.getLineAndCharacterOfPosition(fn.sourceFile, pos);
      const commentEnd = ts.getLineAndCharacterOfPosition(
        fn.sourceFile,
        commentEndPos
      );

      emit.renderComment(sb, parsedComment.docComment);
      const newComment = sb.toString();
      console.log("xx now includes: ", newComment);

      const fileUri = vscode.Uri.file(
        getAbsolutePathInProject(fn.sourceFile.fileName)
      );
      console.log(
        "xx replacing ",
        commentStart.line,
        commentStart.character,
        pos,
        " and ",
        commentEnd.line,
        commentEnd.character,
        commentEndPos
      );
      wse.set(fileUri, [
        [
          vscode.TextEdit.replace(
            new vscode.Range(
              commentStart.line,
              commentStart.character,
              commentEnd.line,
              commentEnd.character
            ),
            newComment
          ),
          { label: "Add example", needsConfirmation: true },
        ],
      ]);
      vscode.workspace.applyEdit(wse);

      if (fileUri === vscode.window.activeTextEditor?.document.uri) {
        console.log("xx applying edit");
      } else {
        console.log(
          "xx fileUri",
          fileUri,
          " !== ",
          vscode.window.activeTextEditor?.document.uri
        );
      }
    },
  };
}

function deleteTestCase(
  state: TypedMap<State>,
  fileName: string,
  functionName: string,
  testCaseIndex: number
) {
  state.set(
    "testCases",
    deleteFunctionTestCase(
      state.get("testCases"),
      fileName,
      functionName,
      testCaseIndex
    )
  );
  state.set(
    "latestTestOutput",
    deleteTestOutput(
      state.get("latestTestOutput"),
      fileName,
      functionName,
      testCaseIndex
    )
  );
  state.set(
    "acceptedTestOutput",
    deleteTestOutput(
      state.get("acceptedTestOutput"),
      fileName,
      functionName,
      testCaseIndex
    )
  );

  // Also update selection, in case we selected a test without an index
  const remainingTestCasesCount =
    findTestCases(state.get("testCases"), fileName, functionName)?.testCases
      .length ?? 0;
  if (
    remainingTestCasesCount > 0 &&
    remainingTestCasesCount >= (testCaseIndex ?? -1)
  ) {
    const newTestIndex = remainingTestCasesCount - 1;
    const newSelection: SelectedFileTestCases = selectTestCaseIndex(
      state.get("selectedTestCases"),
      fileName,
      functionName,
      newTestIndex
    );
    state.set("selectedTestCases", newSelection);
  }
}

function selectTestCaseIndex(
  selectedTestCases: SelectedFileTestCases,
  fileName: string,
  functionName: string,
  newTestIndex: number
): SelectedFileTestCases {
  return {
    ...selectedTestCases,
    [fileName]: {
      ...selectedTestCases[fileName],
      [functionName]: {
        ...selectedTestCases[fileName][functionName],
        testCaseIndex: newTestIndex,
      },
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

/**  */
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
  result: any,
  error?: any
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
        error,
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
