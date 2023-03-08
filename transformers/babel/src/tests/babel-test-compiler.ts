import { transformSync } from "@babel/core";
import generate from "@babel/generator";
import * as babelParser from "@babel/parser";
import { blockStatement, TSDeclareFunction } from "@babel/types";
import { Compiler, UncompiledProject } from "transformer-shared-tests";
import { handleDeclaration } from "../function-builder";

export function compileTestCode(inputCode: string) {
  const inputAst = babelParser.parse(inputCode, {
    plugins: ["typescript"],
  });

  const outputAst = handleDeclaration(
    "Test",
    inputAst.program.body[0] as TSDeclareFunction,
    inputAst.program.body[0].leadingComments,
    "Test"
  );
  if (!outputAst) {
    return null;
  }
  const result = generate(blockStatement(outputAst!));
  const { code } = result;
  return code;
}

export function compileProject(project: UncompiledProject): {
  compiledFiles: Record<string, string>;
  inputFileNameToCompiledFileName: (inputFileName: string) => string;
} {
  const compiled = Object.fromEntries(
    Object.entries(project.projectFiles).map(
      ([filename, code]): [string, string] => {
        const result = transformSync(code, {
          filename,
          presets: ["@babel/preset-typescript"],
          plugins: [
            ["@babel/plugin-transform-modules-commonjs", { strictMode: false }],
            "module:@imaginary-dev/babel-transformer",
          ],

          comments: true,
        });
        const jsFile = filename.replace(/\.ts$/, ".js");
        return [jsFile, result?.code ?? ""];
      }
    )
  );

  return {
    compiledFiles: compiled,
    inputFileNameToCompiledFileName: (tsFilename) =>
      tsFilename.replace(/\.ts$/, ".js"),
  };
}
export const TsCompiler: Compiler = {
  compileProject,
};
