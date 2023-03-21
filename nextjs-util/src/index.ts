import { wrapRemoteImaginaryFunctions } from "./browser";
import { makeNextjsMultiHandler } from "./server";

/**
 * Generic wrapper that works server or client side
 *
 * ```
 * const imaginaryFunctionMap = { fn1, fn2 };
 *
 * // inside server-side [foo].ts to make NextJS handlers.
 * export default wrapImaginaryFunctions(imaginaryFunctionMap, __filename);
 *
 * // inside browser-side foo.ts to create remote wrapper
 * export default wrapImaginaryFunctions(imaginaryFunctionMap, '/api/imaginary')
 * ```
 */
export function wrapImaginaryFunctions<
  T extends { [s: string]: (...args: any[]) => Promise<any> }
>(m: T, apiPrefixOrFilename: string) {
  if (typeof window === "undefined") {
    // server-side wrapper, make nextjs handlers
    const path = require("path");
    const tail = path.basename(apiPrefixOrFilename);
    // Grab the last [urlKey] value from the path
    const match = /\[([^\]]+)\][^/]*$/.exec(tail);
    if (!match) {
      throw new Error(
        "Must pass filename of nextjs API handler such as api/foo/[fnname].ts"
      );
    }
    const [, urlKey] = match;
    return makeNextjsMultiHandler(m, urlKey);
  } else {
    // browser-side wrapper, make a remote caller
    return wrapRemoteImaginaryFunctions(m, apiPrefixOrFilename);
  }
}
