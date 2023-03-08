"use client";
import { testCasesState, workingScenarioState } from "@/state/scenarios";
import { InitialPlaygroundState } from "@/util/playgroundState";
import { compressSync, decompressSync, strFromU8, strToU8 } from "fflate";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRecoilState } from "recoil";

/** Restore the global state from an initialState string */
export function useRestoreState(initialState: string | undefined | null) {
  const [stateError, setStateError] = useState("");
  const [restored, setRestored] = useState(false);
  const initialParams = useMemo(() => {
    if (!initialState) {
      return null;
    }
    try {
      const decoded = decompressSync(strToU8(atob(initialState), true));
      const stateObj = JSON.parse(strFromU8(decoded, true));
      return stateObj as InitialPlaygroundState;
    } catch (ex: any) {
      console.error("Error restoring state: ", ex);
      setStateError(ex.message);
      return null;
    }
  }, [initialState]);

  const [, setWorkingScenario] = useRecoilState(workingScenarioState);
  const [, setTestCases] = useRecoilState(testCasesState);

  useEffect(() => {
    if (initialParams) {
      setWorkingScenario(initialParams.scenario);
      setTestCases(initialParams.testCases);
      setRestored(true);
    }
  }, [initialParams, setTestCases, setWorkingScenario]);
  return { restored, stateError };
}

/** Get a raw state string */
export function useShareState() {
  const [workingScenario] = useRecoilState(workingScenarioState);
  const [testCases] = useRecoilState(testCasesState);

  const getPlaygroundStateStr = useCallback(() => {
    const state: InitialPlaygroundState = {
      scenario: workingScenario,
      testCases,
    };
    const stateString = JSON.stringify(state);
    const compressed = compressSync(strToU8(stateString, true));
    const encoded = btoa(strFromU8(compressed, true));
    return encoded;
  }, [testCases, workingScenario]);

  return getPlaygroundStateStr;
}

export function useRestoreFromUrl() {
  const searchParams = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const initialState = searchParams?.get("state");

  // const { initialState } = props;
  const { stateError, restored } = useRestoreState(initialState);
  useEffect(() => {
    if (restored && path) {
      const url = new URL(`https://foo/${path}?${searchParams}`);
      url.searchParams.delete("state");
      const newSearchParams = url.searchParams.toString();
      // MUST use the same `path` otherwise we'll get a hard navigation
      history.replaceState(
        history.state,
        "",
        makeRelativeUrl(path, newSearchParams)
      );
    }
  }, [path, restored, router, searchParams]);
  return { stateError, restored };
}
function makeRelativeUrl(path: string, newSearchParams: string): string {
  if (!newSearchParams) {
    return path;
  }
  return `${path}?${newSearchParams}`;
}
