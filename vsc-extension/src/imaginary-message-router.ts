import * as vscode from "vscode";
import {
  makeSerializable,
  MaybeSelectedFunction,
  SourceFileMap,
} from "../src-shared/source-info";
import { ReactWebViewProvider } from "./util/react-webview-provider";

/** A message router to broadcast and recieve messages from multiple webviews */

export interface WebviewMessage<T = any> {
  webviewProvider: ReactWebViewProvider;
  message: T;
}
export class ImaginaryMessageRouter {
  webviewProviders: readonly ReactWebViewProvider[];
  disposables: vscode.Disposable[] = [];
  private _onDidReceiveMessage = new vscode.EventEmitter<WebviewMessage>();
  onDidReceiveMessage = this._onDidReceiveMessage.event;
  constructor(webviewProviders: readonly ReactWebViewProvider[]) {
    this.webviewProviders = webviewProviders;

    const disposables = webviewProviders.map((webviewProvider) => {
      return webviewProvider.onDidAttachWebview((webview) => {
        this.disposables.push(
          webview.onDidReceiveMessage((message) => {
            this._onDidReceiveMessage.fire({
              webviewProvider,
              message,
            });
          })
        );
      });
    });
    this.disposables.push(vscode.Disposable.from(...disposables));
  }
  dispose() {
    const d = vscode.Disposable.from(...this.disposables);
    d.dispose();
  }

  async updateSources(sources: SourceFileMap) {
    const serialized = makeSerializable(sources);
    this.postMessage("update-sources", serialized);
  }

  async updateSelection(selection: MaybeSelectedFunction) {
    this.postMessage("update-selection", selection);
  }

  async postMessage<T extends any[]>(messageId: string, ...params: T) {
    this.webviewProviders.forEach((provider) => {
      if (!provider.webviewView) {
        throw new Error("webview has not been initialized");
      }
      return provider.webviewView.webview.postMessage({
        id: messageId,
        params,
      });
    });
  }
}
