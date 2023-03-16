import { getParamNames } from "./util";

function serialize(fn: Function, params: any[]) {
  const paramNames = getParamNames(fn);
  if (paramNames.length !== params.length) {
    throw new Error(
      `Cannot serialize parameters. Function has ${paramNames.length} params, but was passed ${params.length} values.`
    );
  }
  const o = Object.fromEntries(
    paramNames.map((paramName, index) => [paramName, params[index]])
  );
  return JSON.stringify(o);
}

export function wrapRemoteFn<
  F extends (...args: A) => R,
  A extends any[],
  R extends Promise<AR>,
  AR
>(url, fn: F): F {
  const callImaginaryFunction = (async (...args: A): Promise<AR> => {
    const argString = serialize(fn, args);
    const fullUrl = new URL(url, window.location.toString());
    fullUrl.searchParams.set("args", argString);
    const request = await fetch(url);
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
