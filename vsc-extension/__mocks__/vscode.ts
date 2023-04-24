import * as mock from "jest-mock-vscode";

const { URI: Uri, Utils } = jest.requireActual("vscode-uri");
Uri.joinPath = Utils.joinPath;

const localMock = {
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
};

export default {
  ...mock,
  ...localMock,
};
