import { NextApiRequest, NextApiResponse } from "next";
import { makeNextjsHandler } from "./server";
import { NextRequest } from "next/server";
/**
 * Sample Imaginary function
 * @imaginary
 */
function emojify(s: string): Promise<string> {
  return Promise.resolve(s);
}

describe("makeNextjsHandler", () => {
  it("should make a callable wrapper", async () => {
    const emojifySpy = jest.fn(emojify);
    emojifySpy.toString = emojify.toString.bind(emojify);
    const wrapper = makeNextjsHandler(emojifySpy);
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    } as unknown as NextApiResponse;
    const req = {
      query: { args: JSON.stringify("x") },
    } as unknown as NextApiRequest & NextRequest;
    await wrapper(req, res);
    expect(emojifySpy).toBeCalledWith("x");
  });
  it("should error out with no parameters", async () => {
    const emojifySpy = jest.fn(emojify);
    emojifySpy.toString = emojify.toString.bind(emojify);
    const wrapper = makeNextjsHandler(emojifySpy);
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    } as unknown as NextApiResponse;
    const req = {
      query: {},
    } as unknown as NextApiRequest & NextRequest;
    await wrapper(req, res);
    expect(res.status).toBeCalledWith(400);
    expect(res.json).toBeCalledWith({
      error: "No arguments passed to function",
    });
  });
});
