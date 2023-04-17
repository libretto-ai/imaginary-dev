import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

export interface ApiError {
  error: string;
}

export interface ApiResult<R> {
  result: R;
}

// this should be defined by next/server, but I don't see a definition.
type NextRouteHandler = (
  req: NextRequest
) => NextResponse | Promise<NextResponse> | undefined | Promise<undefined>;

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
>(f: F): NextApiHandler | NextRouteHandler {
  const handler:
    | NextApiHandler<ApiResult<AR> | ApiError>
    | NextRouteHandler = async (req: NextRequest | NextApiRequest, res) => {
    const { args } = getQueryParams(req);
    if (!args) {
      return createJsonResponse(
        res,
        {
          error: "No arguments passed to function",
        },
        { status: 400 }
      );
    }
    const argsStr = typeof args === "string" ? args : args[0];

    const fnParams = deserialize(f, argsStr) as A;
    const value = await f(...fnParams);
    return createJsonResponse(res, {
      result: value,
    });
  };

  return handler;
}

function createJsonResponse(
  res: NextResponse | NextApiResponse,
  body: any,
  init?: ResponseInit
) {
  if (typeof res.status === "number") {
    // res is NextResponse, we return a json response from NextResponse static method
    return NextResponse.json(body, init);
  } else {
    // we don't have any way of dealing with other init values in NextApiResponse.
    const status = init?.status ?? 200;
    res.status(status).json(body);
    // note we do not return anything here, deliberately. pre-next 13 api routes do not
    // return a value.
  }
}

function getQueryParams(req: NextApiRequest | NextRequest) {
  if ("query" in req) {
    return req.query ?? {};
  } else {
    return Object.fromEntries(req.nextUrl.searchParams.entries());
  }
}

export function makeNextjsMultiHandler<
  T extends { [s: string]: (...args: any[]) => Promise<any> }
>(map: T, urlKey: string): NextApiHandler {
  const handlers = Object.entries(map).map(
    ([key, fn]): [string, NextApiHandler] => {
      const newHandler = makeNextjsHandler(fn);
      // this is a typescript hack; I'm not updating this function to work with next 13 style
      // route handlers.
      return [key, newHandler as NextApiHandler];
    }
  );
  const handlerMap = Object.fromEntries(handlers);

  const handler: NextApiHandler = async (req, res) => {
    const { [urlKey]: fnName, ...rest } = req.query;
    const fnNameStr = typeof fnName === "string" ? fnName : fnName?.[0];
    if (!fnNameStr || !(fnNameStr in handlerMap)) {
      res.status(404).json({
        error: "No such imaginary function",
      });
      return;
    }
    const newHandler = handlerMap[fnNameStr];

    req.query = rest;
    return newHandler(req, res);
  };
  return handler;
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
