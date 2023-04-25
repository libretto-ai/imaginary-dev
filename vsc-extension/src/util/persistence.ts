import fs from "node:fs/promises";
import path from "node:path";
import {
  FunctionTestCases,
  FunctionTestOutput,
  SourceFileTestCaseMap,
  SourceFileTestCases,
  SourceFileTestOutput,
  SourceFileTestOutputMap,
} from "../../src-shared/source-info";
import { getAbsolutePathInProject } from "./editor";

/** This is the envelope that test cases are written with */
interface TestCaseFile {
  version: "0.1";

  testCases: FunctionTestCases[];
  outputs?: FunctionTestOutput[];
}

export async function writeAllTestCases(
  testCases: SourceFileTestCaseMap,
  outputs: SourceFileTestOutputMap
) {
  const promises = Object.values(testCases).map((value) => {
    if (!value.functionTestCases.length) {
      return;
    }
    const output: SourceFileTestOutput | undefined =
      outputs[value.sourceFileName];
    return writeSourceFileTestCases(value, output);
  });
  await Promise.all(promises);
}
async function writeSourceFileTestCases(
  testCases: SourceFileTestCases,
  testOutputs?: SourceFileTestOutput
): Promise<void> {
  const testCaseFile: TestCaseFile = {
    testCases: testCases.functionTestCases,
    outputs: testOutputs?.functionOutputs ?? [],
    version: "0.1",
  };
  return fs.writeFile(
    getAbsolutePathInProject(getTestCaseFilename(testCases.sourceFileName)),
    JSON.stringify(testCaseFile, null, 2)
  );
}
export async function loadTestCases(sourceFileName: string): Promise<{
  testCases: SourceFileTestCases;
  testOutputs: SourceFileTestOutput;
}> {
  const testCaseFileName = getAbsolutePathInProject(
    getTestCaseFilename(sourceFileName)
  );
  try {
    const testCasesRaw = await fs.readFile(testCaseFileName, {
      encoding: "utf-8",
    });
    const testCaseFile: TestCaseFile = JSON.parse(testCasesRaw);
    const version = testCaseFile.version;

    if (version !== "0.1") {
      console.warn(`Reading in unknown version: ${version}`);
    }
    return {
      testCases: {
        sourceFileName,
        functionTestCases: testCaseFile.testCases ?? [],
      },
      testOutputs: {
        sourceFileName,
        functionOutputs: testCaseFile.outputs ?? [],
      },
    };
  } catch (ex) {
    console.warn(`Unable to load test cases for ${sourceFileName}:`, ex);
    return {
      testCases: { sourceFileName, functionTestCases: [] },
      testOutputs: { sourceFileName, functionOutputs: [] },
    };
  }
}
function getTestCaseFilename(sourceFileName: string) {
  const parsedPath = path.parse(sourceFileName);
  // TODO: should we retain the current extension somewhere?
  parsedPath.ext = `.ipsnapshot.json`;
  parsedPath.base = `${parsedPath.name}${parsedPath.ext}`;
  return path.format(parsedPath);
}
