import type { NextApiRequest, NextApiResponse } from "next";

interface Data {}
export function makeNextjsHandler<
  F extends (...args: A) => R,
  A extends any[],
  R extends Promise<AR>,
  AR
>(f: F): (req: NextApiRequest, res: NextApiResponse<Data | Error>) => void {
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data | Error>
  ) {
    const { args } = req.query ?? {};
    if (!args) {
      console.warn("failure, no args passed to handler: ", args);
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
  }

  return handler;
}

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
