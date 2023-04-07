import { Checker, custom, nullable } from "@recoiljs/refine";
import { atom, DefaultValue, selectorFamily } from "recoil";
import { syncEffect } from "recoil-sync";
import {
  MaybeSelectedFunction,
  SelectedFileTestCases,
  SerializableSourceFileMap,
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
  effects: [synced({})],
});

export const sourcesState = atom<SerializableSourceFileMap>({
  default: {},
  key: "sources",
  effects: [synced({})],
});

export const selectedTestCaseState = atom<SelectedFileTestCases>({
  default: {},
  key: "selectedTestCases",
  effects: [synced({})],
});

export const selectedTestCaseIndexState = selectorFamily({
  key: "yyy",
  get:
    (params: { functionName: string; fileName: string } | null) =>
    ({ get }) => {
      if (!params) {
        return 0;
      }
      const { fileName, functionName } = params;
      const stcs = get(selectedTestCaseState);
      return stcs[functionName]?.[fileName]?.testCaseIndex ?? 0;
    },
  set:
    (params: { functionName: string; fileName: string } | null) =>
    ({ set }, value) => {
      if (!params) {
        return;
      }
      const newValue = value instanceof DefaultValue ? 0 : value;
      const { fileName, functionName } = params;
      set(selectedTestCaseState, (prevValue) => {
        const v: SelectedFileTestCases = {
          ...prevValue,
          [fileName]: {
            ...prevValue[fileName],
            [functionName]: { testCaseIndex: newValue },
          },
        };
        return v;
      });
    },
});
