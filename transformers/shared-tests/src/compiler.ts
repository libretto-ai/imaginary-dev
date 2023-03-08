import { jest } from "@jest/globals";

export type CallImaginaryFunction = (
  functionComment: string,
  functionName: string,
  functionParamDefinitions: { name: string; type?: string }[],
  returnType: string,
  params: Record<string, any>,
  returnSchema: any
) => Promise<any>;

export type CompiledProject = {
  // a map of file names to their content
  compiledFiles: SyntheticFileSet;
  // a function that takes in an input file name and gets the file name of the compiled version of that file
  inputFileNameToCompiledFileName: (inputFileName: string) => string;
};

export type UncompiledProject = {
  projectFiles: SyntheticFileSet;
  rootFiles: string[];
};

// a map of filenames to the file contents
export type SyntheticFileSet = Record<string, string>;

export interface Compiler {
  // takes in a project, which is a map of file names to content in those files  and an array of
  // root files names to compile. it returns a compiled project.
  compileProject: (UncompiledProject) => CompiledProject;
}
