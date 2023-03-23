import { JestConfigWithTsJest, pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "../../tsconfig.base.json";

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePaths: [compilerOptions.baseUrl], // <-- This will be set to 'baseUrl' value
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/../..",
  }),
  setupFilesAfterEnv: ["./setupJest.ts"],
  testPathIgnorePatterns: ["/node_modules/", "dist"],
  collectCoverageFrom: ["<rootDir>/src/**/*.{ts,tsx}"],
};

export default jestConfig;
