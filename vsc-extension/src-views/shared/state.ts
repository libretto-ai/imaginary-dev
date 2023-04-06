import { custom } from "@recoiljs/refine";
import { atom, DefaultValue } from "recoil";
import { syncEffect } from "recoil-sync";

function synced<T>(defaultValue: T) {
  return syncEffect<T>({
    refine: custom((v) => {
      console.log(
        "refining ",
        v,
        "of type",
        typeof v,
        "def:",
        v instanceof DefaultValue
      );
      return v instanceof DefaultValue ? defaultValue : (v as T);
    }),
  });
}

export const debugState = atom<boolean>({
  default: false,
  key: "app.debugMode",
  effects: [synced(false)],
});
