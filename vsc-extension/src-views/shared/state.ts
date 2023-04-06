import { Checker, custom, nullable } from "@recoiljs/refine";
import { atom, DefaultValue } from "recoil";
import { syncEffect } from "recoil-sync";
import {
  MaybeSelectedFunction,
  SourceFileTestCaseMap,
} from "../../src-shared/source-info";

function synced<T>(defaultValue: T, isNullable?: boolean) {
  const validator = custom((v) => {
    return v instanceof DefaultValue ? defaultValue : (v as T);
  });
  return syncEffect<T>({
    refine: isNullable ? (nullable(validator) as Checker<T>) : validator,
  });
}

export const debugState = atom<boolean>({
  default: false,
  key: "app.debugMode",
  effects: [synced(false)],
});

export const selectedFunctionState = atom<MaybeSelectedFunction>({
  default: null,
  key: "selectedFunction",
  effects: [synced<MaybeSelectedFunction>(null, true)],
});

export const testCasesState = atom<SourceFileTestCaseMap>({
  default: {},
  key: "testCases",
  effects: [synced<SourceFileTestCaseMap>({})],
});
