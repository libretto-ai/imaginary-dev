import type { NextApiHandler } from "next";

interface ApiError {
  error: string;
}

interface ApiResult<R> {
  result: R;
}

/**
 * Wrap an imaginary function into a nextjs endpoint.
 * @see wrapRemoteFn for the browser side.
 *
 * @example
 * ```
 * /**
 *  * @imaginary
 *  *+/
 * declare function emojify(s: string): Promise<string>;
 *
 * export default makeNextjsHandler(emojify);
 * ```
 */
export function makeNextjsHandler<
  F extends (...args: A) => R,
  A extends any[],
  R extends Promise<AR>,
  AR
>(f: F): NextApiHandler {
  const handler: NextApiHandler<ApiResult<AR> | ApiError> = async (
    req,
    res
  ) => {
    const { args } = req.query ?? {};
    if (!args) {
      res.status(400).json({
        error: "No arguments passed to function",
      });
      return;
    }
    const argsStr = typeof args === "string" ? args : args[0];

    const fnParams = deserialize(f, argsStr) as A;
    const value = await f(...fnParams);
    res.status(200).json({
      result: value,
    });
  };

  return handler;
}

export function makeNextjsHandlers<
  F extends ((...args: any[]) => Promise<any>)[]
>(functions: F) {
  return functions.map((f) => f);
}

/**
 * Deserialize parameters passed into the API
 * @see serialize from browser.ts
 */
function deserialize<A extends any[]>(
  fn: (...args: A) => any,
  params: string
): A {
  const paramValues = JSON.parse(params);

  // This approach does not work, as babel renames the parameters. See matching
  // code in `serialize()`.
  // const paramNames = getParamNames(fn); const paramArgs =
  // paramNames.map((paramName) => paramValues[paramName]); return paramArgs as
  // A;

  return paramValues as A;
}
