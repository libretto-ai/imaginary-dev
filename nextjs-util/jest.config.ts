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
  automock: false,
  collectCoverageFrom: ["<rootDir>/src/**/*.{ts,tsx}"],
  setupFiles: ["./setupJest.ts"],
};

export default jestConfig;
