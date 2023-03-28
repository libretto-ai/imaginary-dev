import { resolve } from "path";
import { createContext, Script } from "vm";
import {
  CallImaginaryFunction,
  Compiler,
  SyntheticFileSet,
  UncompiledProject,
} from "./compiler";

export function makeConditionalTest(
  supported: boolean,
  throwString: string | RegExp
): (name: string, fn: () => void) => void {
  return supported
    ? test
    : (name: string, fn: any) =>
        test(name, () => {
          expect(fn).toThrow(throwString);
        });
}

export function makeBimodalErrorTest(
  supported: boolean,
  errorIfSupported: string | RegExp,
  errorIfNotSupported: string | RegExp
) {
  return (name, fn) => {
    test(name, () => {
      expect(fn).toThrow(supported ? errorIfSupported : errorIfNotSupported);
    });
  };
}
type CompiledProjectToRun = {
  files: SyntheticFileSet;
  entryPoint: string;
};
const PROMPT_ENGINE_MODULE = "@imaginary-dev/runtime";

export const CALL_IMAGINARY_FUNCTION_NAME = "callImaginaryFunction";

const makePathAbsolute = (relativePath: string) =>
  resolve(process.cwd(), relativePath);

export function compile(compiler: Compiler, codeToCompile: string): string {
  const compiledProject = compiler.compileProject({
    projectFiles: { "index.ts": codeToCompile },
    rootFiles: ["index.ts"],
  });
  return compiledProject.compiledFiles[
    compiledProject.inputFileNameToCompiledFileName("index.ts")
  ];
}

export function runCompiledImaginaryScript(
  code: string | CompiledProjectToRun,
  modules: Record<string, Record<string, any>>
) {
  const compiledProjectToRun = getCompiledProjectToRun(code);
  const context = {
    console,
    global: {},
    module: {},
    exports: {},
    require: (id) => {
      const compiledModuleId =
        Object.keys(compiledProjectToRun.files).find(
          (moduleId) => makePathAbsolute(id) === makePathAbsolute(moduleId)
        ) ??
        Object.keys(compiledProjectToRun.files).find(
          (moduleId) =>
            makePathAbsolute(id + ".js") === makePathAbsolute(moduleId)
        );

      if (compiledModuleId) {
        // I'm not entirely sure this is the right way to execute an imported file, but it seems
        // to work.
        const subContext = {
          console,
          global: {},
          module: {},
          exports: {},
          require: context.require,
        };
        const script = new Script(compiledProjectToRun.files[compiledModuleId]);
        const returnValue = script.runInNewContext(subContext);
        return subContext.exports;
      }
      if (Object.keys(modules).find((moduleId) => id === moduleId)) {
        return modules[id];
      }
      return null;
    },
  };
  context.global = global;

  const sandbox = createContext(context);
  const script = new Script(
    compiledProjectToRun.files[compiledProjectToRun.entryPoint]
  );
  return script.runInContext(sandbox);
}

export function compileAndRun(
  compiler: Compiler,
  code: string | UncompiledProject,
  modules: Record<string, Record<string, any>>,
  fileToRun?: string
) {
  if (typeof code === "string" && typeof fileToRun !== "undefined") {
    throw new Error(
      "fileToRun argument can only be used when code is an UncompiledProject"
    );
  }
  let uncompiledProject: UncompiledProject;
  if (typeof code === "string") {
    uncompiledProject = {
      projectFiles: { "index.ts": code },
      rootFiles: ["index.ts"],
    };
  } else {
    uncompiledProject = code;
  }
  const compiledCode = compiler.compileProject(uncompiledProject);
  return runCompiledImaginaryScript(
    {
      files: compiledCode.compiledFiles,
      entryPoint: compiledCode.inputFileNameToCompiledFileName(
        fileToRun ? fileToRun : uncompiledProject.rootFiles[0]
      ),
    },
    modules
  );
}

export function compileAndRunWithCallImaginaryMock(
  compiler: Compiler,
  code: string | UncompiledProject,
  mockCallImaginary: jest.Mock<CallImaginaryFunction>,
  fileToRun?: string
) {
  return compileAndRun(
    compiler,
    code,
    {
      [PROMPT_ENGINE_MODULE]: {
        [CALL_IMAGINARY_FUNCTION_NAME]: mockCallImaginary,
      },
    },
    fileToRun
  );
}

function getCompiledProjectToRun(
  code: string | CompiledProjectToRun
): CompiledProjectToRun {
  if (typeof code === "string") {
    return { files: { "index.js": code }, entryPoint: "index.js" };
  }
  return code;
}
