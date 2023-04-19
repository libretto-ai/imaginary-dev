import { NextRouteHandler, makeNextjsHandler } from "./server";
import { wrapRemoteImaginaryFunction } from "./browser";

export function imagineAppRoute<
  F extends (...args: any[]) => R,
  R extends Promise<AR>,
  AR
>(fn: F, url: string): F & { GET: NextRouteHandler } {
  let result: F & { GET: NextRouteHandler } = wrapRemoteImaginaryFunction(
    url,
    fn
  ) as F & { GET: NextRouteHandler };
  result.GET = makeNextjsHandler(fn) as NextRouteHandler;

  return result;
}

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

export const imaginePageRoute = makeImaginaryNextFunction;
