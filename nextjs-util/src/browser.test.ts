/**
 * @jest-environment jsdom
 */

import fetchMock, { enableFetchMocks } from "jest-fetch-mock";
enableFetchMocks();

import { wrapRemoteFn } from "./browser";

/**
 * @imaginary
 */
function emojify(s: string): Promise<string> {
  return Promise.resolve(s);
}
beforeEach(() => {
  fetchMock.resetMocks();
});
describe("wrapRemoteFn", () => {
  it("should make a callable wrapper", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ result: "Emoji Here" }));
    const wrappedEmojify = wrapRemoteFn("/api/emojify", emojify);

    const value = await wrappedEmojify("Hello");

    expect(value).toEqual("Emoji Here");
  });
});
