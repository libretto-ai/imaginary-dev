import { makeNextjsHandler } from "@imaginary-dev/nextjs-util/server";
import { wrapRemoteImaginaryFunction } from "@imaginary-dev/nextjs-util/browser";

export function makeImaginaryNextFunction<
  F extends (...args: any[]) => R,
  R extends Promise<AR>,
  AR
>(fn: F, url: string): F {
  if (typeof window === "undefined") {
    // this typing is a lie, but it won't be noticed in api endpoints bc TypeScript
    // doesn't check.
    return makeNextjsHandler(fn) as F;
  }

  // we are on the browser side.
  return wrapRemoteImaginaryFunction(url, fn);
}
