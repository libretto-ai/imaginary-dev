// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { callImaginaryFunction } from "@imaginary-dev/runtime";
import { ImaginaryFunctionDefinition } from "@imaginary-dev/util";
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  type: "response";
  response: any;
};

type Error = {
  type: "error";
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | Error>
) {
  try {
    const definition: ImaginaryFunctionDefinition = parseAsJson(
      req.query.definition
    );
    const parameters: Record<string, any> = parseAsJson(req.query.parameters);

    if (definition === null) {
      res
        .status(500)
        .json({ type: "error", error: "Missing parameter 'definition'." });
      return;
    }
    if (parameters === null) {
      res
        .status(500)
        .json({ type: "error", error: "Missing parameter 'parameters'." });
      return;
    }

    const response = await callImaginaryFunction(
      definition.funcComment,
      definition.funcName,
      definition.parameterTypes,
      definition.returnSchema ?? {},
      parameters,
      definition.serviceParameters
    );

    res
      .status(200)
      // helps for examples which are often tried the first time
      .setHeader("Cache-Control", "public,max-age=3600")
      .json({ type: "response", response });
  } catch (e: any) {
    return res.status(e.status ?? 400).json({
      type: "error",
      error: e.message,
    });
  }
}

function parseAsJson(param: string | string[] | undefined) {
  if (typeof param === "undefined") {
    return null;
  }
  if (Array.isArray(param)) {
    return null;
  }
  return JSON.parse(param);
}
