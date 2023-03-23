import { ImaginaryFunctionDefinition } from "@imaginary-dev/util";
import fetchMock from "jest-fetch-mock";
import { beginReportEvent, finishReport, reportEventErrors } from "./reporting";

fetchMock.enableMocks();

describe("beginReportEvent", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("should not report if projectKey is missing", async () => {
    process.env.PROMPT_PROJECT_KEY = "";
    const response = await beginReportEvent(
      "eventId",
      {} as ImaginaryFunctionDefinition,
      {}
    );
    expect(response).toBeUndefined();
  });

  it("should report if projectKey is set", async () => {
    process.env.PROMPT_PROJECT_KEY = "projectKey";
    process.env.PROMPT_REPORTING_URL = "https://foo.com";
    fetchMock.mockResponseOnce(JSON.stringify({ ok: true }));
    await beginReportEvent("eventId", {} as ImaginaryFunctionDefinition, {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("finishReport", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("should not report if projectKey is missing", async () => {
    process.env.PROMPT_PROJECT_KEY = "";
    const response = await finishReport(
      "eventId",
      {} as ImaginaryFunctionDefinition,
      {},
      new Date(),
      null
    );
    expect(response).toBeUndefined();
  });

  it("should report if projectKey is set", async () => {
    process.env.PROMPT_PROJECT_KEY = "projectKey";
    fetchMock.mockResponseOnce(JSON.stringify({ ok: true }));
    await finishReport(
      "eventId",
      {} as ImaginaryFunctionDefinition,
      {},
      new Date(),
      null
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("reportEventErrors", () => {
  beforeEach(() => {
    console.error = jest.fn();
  });

  it("should handle rejected events", async () => {
    const beginEventPromise = Promise.reject(new Error("beginEventError"));
    const finishEventPromise = Promise.reject(new Error("finishEventError"));
    await reportEventErrors(beginEventPromise, finishEventPromise);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
