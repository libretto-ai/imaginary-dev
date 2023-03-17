import { getParamNames } from "./util";

/**
 * Wrap an imaginary function with a lightweight async call to an API endpoint.
 * The return value is a function that is signature-compatible with the original
 * function.
 *
 * @see makeNextjsHandler for the server side.
 *
 * @example
 * ```ts
 * // Wrap this once at the module level.
 * const emojifyRemote = wrapRemoteFn(emojify);
 *
 *   // Inside a hook or event handler
 *   useEffect(() => {
 *     const emojified = await emojifyRemote(userInput);
 *   }, [userInput])
 * ```
 */
export function wrapRemoteFn<
  F extends (...args: A) => R,
  A extends any[],
  R extends Promise<AR>,
  AR
>(url: string, fn: F): F {
  const callImaginaryFunction = (async (...args: A): Promise<AR> => {
    console.log("unwrapping ", fn.toString());
    const argString = serialize(fn, args);
    console.log("calling remote fn with ", argString);
    const fullUrl = new URL(url, window.location.toString());
    fullUrl.searchParams.set("args", argString);
    console.log("fetching ", fullUrl);
    const request = await fetch(fullUrl);
    const response = await request.json();
    if (!request.ok) {
      if (response.error) {
        throw new Error(response.error);
      }
      throw new Error(
        `Failed to call server-side imaginary function: ${request.statusText}`
      );
    }
    return response.result;
  }) as F;
  return callImaginaryFunction;
}

/**
 * Serialize the parameters to a function call
 * @see deserialize in server.ts
 */
function serialize(fn: Function, params: any[]) {
  const paramNames = getParamNames(fn);
  if (paramNames.length !== params.length) {
    throw new Error(
      `Cannot serialize parameters. Function has ${paramNames.length} params, but was passed ${params.length} values.`
    );
  }
  // This approach does not work, as babel renames the parameters, and you get
  // paramter names like "_x" etc.
  // const o = Object.fromEntries( paramNames.map((paramName, index) =>
  //   [paramName, params[index]])
  // );
  return JSON.stringify(params);
}
