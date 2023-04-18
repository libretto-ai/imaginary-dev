import { JestConfigWithTsJest, pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "../tsconfig.base.json";

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePaths: [compilerOptions.baseUrl], // <-- This will be set to 'baseUrl' value
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/..",
  }),
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  collectCoverageFrom: [
    // TODO: include tsx for (eventual) react tests
    "<rootDir>/src/**/*.ts",
    "<rootDir>/src-*/**/*.ts",
  ],
};

export default jestConfig;
