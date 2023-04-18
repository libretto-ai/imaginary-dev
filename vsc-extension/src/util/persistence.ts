import fs from "node:fs/promises";
import path from "node:path";
import {
  FunctionTestCases,
  SourceFileTestCaseMap,
  SourceFileTestCases,
} from "../../src-shared/source-info";
import { getAbsolutePathInProject } from "./editor";

/** This is the envelope that test cases are written with */
interface TestCaseFile {
  version: "0.1";

  testCases: FunctionTestCases[];
}

export async function writeAllTestCases(testCases: SourceFileTestCaseMap) {
  const promises = Object.values(testCases).map((value) => {
    if (!value.functionTestCases.length) {
      return;
    }
    return writeSourceFileTestCases(value);
  });
  await Promise.all(promises);
}
function writeSourceFileTestCases(
  value: SourceFileTestCases
): Promise<void> | undefined {
  const testCaseFile: TestCaseFile = {
    testCases: value.functionTestCases,
    version: "0.1",
  };
  return fs.writeFile(
    getAbsolutePathInProject(getTestCaseFilename(value.sourceFileName)),
    JSON.stringify(testCaseFile, null, 2)
  );
}
export async function loadTestCases(
  sourceFileName: string
): Promise<SourceFileTestCases> {
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
      sourceFileName,
      functionTestCases: testCaseFile.testCases,
    };
  } catch (ex) {
    console.warn(`Unable to load test cases for ${sourceFileName}:`, ex);
    return { sourceFileName, functionTestCases: [] };
  }
}
function getTestCaseFilename(sourceFileName: string) {
  const parsedPath = path.parse(sourceFileName);
  // TODO: should we retain the current extension somewhere?
  parsedPath.ext = `.ipsnapshot.json`;
  parsedPath.base = `${parsedPath.name}${parsedPath.ext}`;
  return path.format(parsedPath);
}
