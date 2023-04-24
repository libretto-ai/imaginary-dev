import * as mock from "jest-mock-vscode";
import vscode from "vscode";

const { URI: Uri, Utils } = jest.requireActual("vscode-uri");
Uri.joinPath = Utils.joinPath;

const m = {
  Uri,
  workspace: {
    workspaceFolders: [
      {
        uri: Uri.file("/path/to/workspace"),
      },
    ],
    openTextDocument: jest.fn(),
  },
  window: {
    showTextDocument: jest.fn(),
  },
  Position: jest.fn().mockImplementation(function (): vscode.Position {
    return {
      line: 0,
      character: 0,
      isBefore(other) {
        return false;
      },
      compareTo(other) {
        return 0;
      },
      isAfter(other) {
        return false;
      },
      isAfterOrEqual(other) {
        return false;
      },
      isBeforeOrEqual(other) {
        return false;
      },
      isEqual(other) {
        return false;
      },
      translate() {
        return this;
      },
      with() {
        return this;
      },
    };
  }),
  Range: jest.fn(),
};

export default {
  ...mock,
  ...m,
};
