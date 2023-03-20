import { getParamNames } from "./util";

describe("getParamNames", () => {
  it("should parse out parameter names", () => {
    function callMe(one: string, two: number, three): string {
      return "this is just a stub";
    }
    expect(getParamNames(callMe)).toEqual(["one", "two", "three"]);
  });
});
