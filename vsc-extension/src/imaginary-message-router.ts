import * as vscode from "vscode";
import { ImaginaryMessage } from "../src-shared/messages";
import {
  makeSerializable,
  MaybeSelectedFunction,
  SourceFileMap,
  SourceFileTestCaseMap,
} from "../src-shared/source-info";
import { ReactWebViewProvider } from "./util/react-webview-provider";

/** A message router to broadcast and recieve messages from multiple webviews */

export interface WebviewMessage<M extends ImaginaryMessage> {
  webviewProvider: ReactWebViewProvider;
  message: M;
}
export class ImaginaryMessageRouter {
  webviewProviders: readonly ReactWebViewProvider[];
  // Keep track of which webviews are attached or not
  attachedWebviewProviders: ReactWebViewProvider[] = [];
  disposables: vscode.Disposable[] = [];
  private _onDidReceiveMessage = new vscode.EventEmitter<
    WebviewMessage<ImaginaryMessage>
  >();
  onDidReceiveMessage = this._onDidReceiveMessage.event;
  constructor(webviewProviders: readonly ReactWebViewProvider[]) {
    this.webviewProviders = webviewProviders;

    const disposables = webviewProviders.flatMap((webviewProvider) => {
      const attachDisposable = webviewProvider.onDidAttachWebview((webview) => {
        this.attachedWebviewProviders.push(webviewProvider);
        this.disposables.push(
          webview.onDidReceiveMessage((message) => {
            this._onDidReceiveMessage.fire({
              webviewProvider,
              message,
            });
          })
        );
      });
      const detatchDisposable = webviewProvider.onDidDetatchWebview(() => {
        // TODO: dispose of attached onDidReceiveMessage disposable
        this.attachedWebviewProviders = this.attachedWebviewProviders.filter(
          (provider) => provider !== webviewProvider
        );
      });
      return [attachDisposable, detatchDisposable];
    });
    this.disposables.push(vscode.Disposable.from(...disposables));
  }
  dispose() {
    const d = vscode.Disposable.from(...this.disposables);
    d.dispose();
  }

  async updateSources(
    sources: Readonly<SourceFileMap>,
    ignoreProvider?: ReactWebViewProvider
  ) {
    const serialized = makeSerializable(sources);
    return this.postMessage("update-sources", [serialized], ignoreProvider);
  }

  async updateFunctionSelection(
    selection: MaybeSelectedFunction,
    ignoreProvider?: ReactWebViewProvider
  ) {
    return this.postMessage(
      "update-function-selection",
      [selection],
      ignoreProvider
    );
  }

  async updateTestCases(
    testCases: SourceFileTestCaseMap,
    ignoreProvider?: ReactWebViewProvider
  ) {
    return this.postMessage("update-testcases", [testCases], ignoreProvider);
  }

  async updateSelectedTestCases(
    selectedTestCases: SourceFileTestCaseMap,
    ignoreProvider?: ReactWebViewProvider
  ) {
    return this.postMessage(
      "update-selected-test-cases",
      [selectedTestCases],
      ignoreProvider
    );
  }

  async postMessage<
    M extends ImaginaryMessage,
    K extends M["id"],
    T extends M["params"]
  >(messageId: K, params: T, ignoreWebview?: ReactWebViewProvider) {
    const result = this.attachedWebviewProviders.map((provider) => {
      if (!provider.webviewView) {
        throw new Error("webview has not been initialized");
      }
      // Avoids broadcast feedback loops
      if (provider === ignoreWebview) {
        return true;
      }
      const message = {
        id: messageId,
        params,
      } as ImaginaryMessage;
      return provider.webviewView.webview.postMessage(message);
    });
    return Promise.allSettled(result);
  }
}
