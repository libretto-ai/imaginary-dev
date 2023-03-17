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

  it("should bail if invalid parameters", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ result: "Emoji Here" }));
    const wrappedEmojify = wrapRemoteFn("/api/emojify", emojify) as Function;

    expect(async () => {
      const value = await wrappedEmojify("Hello", "there");
    }).rejects.toThrow("Cannot serialize parameters.");
  });

  it("should propagate response errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ error: "Some endpoint failure" }),
      {
        status: 400,
      }
    );
    const wrappedEmojify = wrapRemoteFn("/api/emojify", emojify);

    expect(async () => {
      const value = await wrappedEmojify("Hello");
    }).rejects.toThrow("Some endpoint failure");
  });
  it("should propagate bad json", async () => {
    fetchMock.mockResponseOnce("Hard failure", {
      status: 400,
    });
    const wrappedEmojify = wrapRemoteFn("/api/emojify", emojify);

    expect(async () => {
      const value = await wrappedEmojify("Hello");
    }).rejects.toThrow("invalid json response body ");
  });
  it("should propagate unrecognized json error", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ status: "failure" }), {
      status: 429,
    });
    const wrappedEmojify = wrapRemoteFn("/api/emojify", emojify);

    expect(async () => {
      const value = await wrappedEmojify("Hello");
    })
      // translation of 429
      .rejects.toThrow("Too Many Requests");
  });
});
