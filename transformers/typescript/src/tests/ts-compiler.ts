import { mkdtempSync, readFileSync } from "fs";
import { resolve } from "path";
import { Compiler, UncompiledProject } from "transformer-shared-tests";
import * as ts from "typescript";
import imaginaryTransformer from "../ts-prompt-transformer";

const compilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  target: ts.ScriptTarget.ES2019,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  strictNullChecks: true,
  // sourceMap: true,
  lib: ["es2015"],
};

const makePathAbsolute = (relativePath: string) =>
  resolve(process.cwd(), relativePath);

export function compileProject(project: UncompiledProject): {
  compiledFiles: Record<string, string>;
  inputFileNameToCompiledFileName: (inputFileName: string) => string;
} {
  const nodeModulesCache: Record<string, string> = {};
  // normalize the paths.
  const normalizedProjectFiles = Object.fromEntries(
    Object.entries(project.projectFiles).map(([key, value]) => [
      makePathAbsolute(key),
      value,
    ])
  );
  const normalizedRootFiles = project.rootFiles.map(makePathAbsolute);

  // Create a Program with an in-memory emit
  const createdFiles = {};
  const host = ts.createCompilerHost(compilerOptions);

  const originalFileExists = host.fileExists;

  host.fileExists = (fileName) => {
    if (Object.keys(normalizedProjectFiles).indexOf(fileName) !== -1) {
      return true;
    }
    return originalFileExists.apply(host, [fileName]);
  };
  const mrc = ts.createModuleResolutionCache(
    mkdtempSync("ts-cache-"),
    (s) => s,
    compilerOptions
  );
  host.getModuleResolutionCache = () => mrc;

  host.readFile = (fileName: string) => {
    // we need to make sure that ts compiler can get to the real node_modules so it
    // can find .d.ts files for things like Promise.
    if (fileName.match(/node_modules/)) {
      if (fileName in nodeModulesCache) {
        return nodeModulesCache[fileName];
      }
      const fileBody = readFileSync(fileName, { encoding: "utf-8" });
      nodeModulesCache[fileName] = fileBody;
      return fileBody;
    }

    // if it's one of the files we are compiling, return the contents.
    if (Object.keys(normalizedProjectFiles).indexOf(fileName) !== -1) {
      return normalizedProjectFiles[fileName];
    }
    return "";
  };
  host.writeFile = (fileName: string, contents: string) => {
    createdFiles[fileName] = contents;
  };

  // Prepare and emit the files
  const program = ts.createProgram(normalizedRootFiles, compilerOptions, host);
  program.emit(undefined, undefined, undefined, undefined, {
    before: [imaginaryTransformer(program)],
  });

  return {
    compiledFiles: createdFiles,
    inputFileNameToCompiledFileName: (inputFileName) =>
      makePathAbsolute(inputFileName).replace(/\.tsx?$/, ".js"),
  };
}

export const TsCompiler: Compiler = {
  compileProject,
};
