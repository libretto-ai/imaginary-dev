import type { NextApiRequest, NextApiResponse } from "next";
import { getParamNames } from "./util";

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
  const paramNames = getParamNames(fn);
  const paramArgs = paramNames.map((paramName) => paramValues[paramName]);
  return paramArgs as A;
}

export function wrapImaginaryFunction<
  F extends (...args: A) => R,
  A extends any[],
  R extends Promise<AR>,
  AR
>(f: F): F {
  const newF = (async (...args) => {
    return {} as AR;
  }) as F;
  return newF;
}
