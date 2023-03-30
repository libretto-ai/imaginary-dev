import {
  makeSerializable,
  MaybeSelectedFunction,
  SourceFileMap,
} from "../src-shared/source-info";
import { ReactWebViewProvider } from "./react-webview-provider";

/** A message router to broadcast and recieve messages from multiple webviews */

export class ImaginaryMessageRouter {
  webviewProviders: readonly ReactWebViewProvider[];
  constructor(webviewProviders: readonly ReactWebViewProvider[]) {
    this.webviewProviders = webviewProviders;
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
