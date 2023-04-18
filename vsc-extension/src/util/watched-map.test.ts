import { TypedMap } from "./types";
import { createWatchedMap } from "./watched-map";

// Mocking the vscode module and EventEmitter
jest.mock("vscode", () => {
  return {
    fire: jest.fn(),
    EventEmitter: jest.fn().mockImplementation(function () {
      this.fire = jest.fn();
      this.event = jest.fn();
      return this;
    }),
  };
});

// Importing the mocked vscode module
import vscode from "vscode";

describe("watched-map", () => {
  let typedMap: TypedMap<{ name: string; age: number }>;
  const EventEmitter = jest.mocked(vscode.EventEmitter);

  beforeEach(() => {
    typedMap = new Map() as TypedMap<{ name: string; age: number }>;
  });

  describe("createWatchedMap", () => {
    it("should create a watched map that fires events on state change", () => {
      const watchedMap = createWatchedMap(typedMap);

      // Setting values in the watched map
      watchedMap.set("name", "John");
      watchedMap.set("age", 30);

      // Checking if EventEmitter is called correctly
      expect(EventEmitter).toHaveBeenCalledTimes(1);

      // Checking if fire method of EventEmitter is called with correct values
      expect(EventEmitter.mock.instances[0].fire).toHaveBeenCalledTimes(2);
      expect(EventEmitter.mock.instances[0].fire).toHaveBeenNthCalledWith(1, {
        name: "John",
      });
      expect(EventEmitter.mock.instances[0].fire).toHaveBeenNthCalledWith(2, {
        age: 30,
      });
    });

    it("should return the correct values when getting values from the watched map", () => {
      const watchedMap = createWatchedMap(typedMap);

      // Setting and getting values in the watched map
      watchedMap.set("name", "John");
      watchedMap.set("age", 30);

      expect(watchedMap.get("name")).toEqual("John");
      expect(watchedMap.get("age")).toEqual(30);
    });
  });
});
