import { readFileSync } from "fs";
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
  extendedDiagnostics: true,
  exclude: ["**/node_modules"],
};

const makePathAbsolute = (relativePath: string) =>
  resolve(process.cwd(), relativePath);

export function compileProject(project: UncompiledProject): {
  compiledFiles: Record<string, string>;
  inputFileNameToCompiledFileName: (inputFileName: string) => string;
} {
  const nodeModulesASTCache: Record<string, ts.SourceFile> = {};

  // normalize the paths.
  const normalizedProjectFiles = Object.fromEntries(
    Object.entries(project.projectFiles).map(([key, value]) => [
      makePathAbsolute(key),
      value,
    ])
  );
  const normalizedProjectFilenames = Object.keys(normalizedProjectFiles);

  const normalizedRootFiles = project.rootFiles.map(makePathAbsolute);

  // Create a Program with an in-memory emit
  const createdFiles = {};
  const host = ts.createCompilerHost(compilerOptions);

  const originalFileExists = host.fileExists;
  host.fileExists = (fileName) => {
    if (normalizedProjectFilenames.indexOf(fileName) !== -1) {
      return true;
    }
    return originalFileExists.apply(host, [fileName]);
  };

  const originalGetSourceFile = host.getSourceFile;
  host.getSourceFile = (fileName, ...rest) => {
    if (fileName.includes("/node_modules/")) {
      // only cache files in node_modules
      if (fileName in nodeModulesASTCache) {
        return nodeModulesASTCache[fileName];
      }
      const sourceFile = originalGetSourceFile.apply(host, [fileName, ...rest]);
      nodeModulesASTCache[fileName] = sourceFile;
      return sourceFile;
    } else {
      // never cache local files
      return originalGetSourceFile.apply(host, [fileName, ...rest]);
    }
  };

  host.readFile = (fileName: string) => {
    // we need to make sure that ts compiler can get to the real node_modules so it
    // can find .d.ts files for things like Promise.
    if (fileName.includes("/node_modules/")) {
      const fileBody = readFileSync(fileName, { encoding: "utf-8" });
      return fileBody;
    }

    // if it's one of the files we are compiling, return the contents.
    if (normalizedProjectFilenames.indexOf(fileName) !== -1) {
      return normalizedProjectFiles[fileName];
    }
    return "";
  };
  host.writeFile = (fileName: string, contents: string) => {
    createdFiles[fileName] = contents;
  };

  // Prepare and emit the files
  const program = ts.createProgram(normalizedRootFiles, compilerOptions, host);
  const sourceFiles = program.getSourceFiles().filter((f) => {
    const absoluteSourceFile = makePathAbsolute(f.fileName);
    return (
      normalizedRootFiles.includes(absoluteSourceFile) ||
      normalizedProjectFilenames.includes(absoluteSourceFile)
    );
  });
  sourceFiles.forEach((sourceFile) => {
    const result = program.emit(sourceFile, undefined, undefined, undefined, {
      before: [imaginaryTransformer(program)],
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(result.diagnostics);
    diagnostics.forEach((diagnostic) => {
      const { line, character } =
        diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start!) ?? {
          line: -1,
          character: -1,
        };
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
    });
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
