import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vscode from "vscode";
import {
  SourceFileTestCaseMap,
  SourceFileTestCases,
} from "../../src-shared/source-info";
import { loadTestCases, writeAllTestCases } from "./persistence";

// Helper function to create a temporary directory for testing
async function createTempDirectory(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "temp-"));
  return tempDir;
}

jest.mock("vscode", () => {
  const { URI: Uri, Utils } = jest.requireActual("vscode-uri");
  Uri.joinPath = Utils.joinPath;
  return {
    Uri,
    workspace: {
      workspaceFolders: [],
    },
  };
});
describe("persistence", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDirectory();
    (vscode.workspace.workspaceFolders as any) = [
      { uri: vscode.Uri.file(tempDir), name: "root", index: 0 },
    ] satisfies vscode.WorkspaceFolder[];
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("writeAllTestCases", () => {
    it("should write all test cases to the appropriate files", async () => {
      const testCases: SourceFileTestCaseMap = {
        "example.ts": {
          sourceFileName: "example.ts",
          functionTestCases: [
            {
              functionName: "add",
              testCases: [
                {
                  name: "add positive numbers",
                  inputs: { a: 1, b: 2 },
                },
              ],
            },
          ],
        },
      };

      await writeAllTestCases(testCases);

      const savedTestCases = await loadTestCases("example.ts");
      expect(savedTestCases).toEqual(testCases["example.ts"]);
    });
  });

  describe("loadTestCases", () => {
    it("should load test cases from a given file", async () => {
      const testCases: SourceFileTestCases = {
        sourceFileName: "example.ts",
        functionTestCases: [
          {
            functionName: "add",
            testCases: [
              {
                name: "add positive numbers",
                inputs: { a: 1, b: 2 },
              },
            ],
          },
        ],
      };

      const testCaseFilename = "example.ipsnapshot.json";
      await fs.writeFile(
        path.join(tempDir, testCaseFilename),
        JSON.stringify(
          { version: "0.1", testCases: testCases.functionTestCases },
          null,
          2
        )
      );

      const loadedTestCases = await loadTestCases("example.ts");
      expect(loadedTestCases).toEqual(testCases);
    });

    it("should return an empty object if the test case file does not exist", async () => {
      const loadedTestCases = await loadTestCases("nonexistent.ts");
      expect(loadedTestCases).toEqual({
        sourceFileName: "nonexistent.ts",
        functionTestCases: [],
      });
    });
  });
});
