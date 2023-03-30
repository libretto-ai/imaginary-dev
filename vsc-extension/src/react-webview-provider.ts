import html from "html-template-tag";
import * as vscode from "vscode";
import {
  makeSerializable,
  MaybeSelectedFunction,
  SourceFileMap,
} from "../src-shared/source-info";

export function registerWebView(
  extensionContext: vscode.ExtensionContext,
  viewName: string,
  panelName: string
) {
  const webviewProvider = new ReactWebViewProvider(extensionContext, panelName);
  extensionContext.subscriptions.push(
    vscode.window.registerWebviewViewProvider(viewName, webviewProvider)
  );
  return webviewProvider;
}

export class ReactWebViewProvider implements vscode.WebviewViewProvider {
  viewId: string;
  extensionContext: vscode.ExtensionContext;
  webviewView?: vscode.WebviewView;
  constructor(extensionContext: vscode.ExtensionContext, webviewId: string) {
    this.viewId = webviewId;
    this.extensionContext = extensionContext;
  }

  async updateSources(sources: SourceFileMap) {
    const serialized = makeSerializable(sources);
    this.postMessage("update-sources", serialized);
  }

  async updateSelection(selection: MaybeSelectedFunction) {
    this.postMessage("update-selection", selection);
  }

  async postMessage<T extends any[]>(messageId: string, ...params: T) {
    if (!this.webviewView) {
      throw new Error("webview has not been initialized");
    }
    return this.webviewView.webview.postMessage({
      id: messageId,
      params,
    });
  }

  dispatch(e: any) {
    console.log("got message from webview", e);
  }
  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    const extensionRoot = vscode.Uri.joinPath(
      this.extensionContext.extensionUri,
      "dist"
    );
    this.webviewView = webviewView;
    webviewView.webview.onDidReceiveMessage((e) => {
      this.dispatch(e);
    });
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionRoot],
    };
    const nonce = getNonce();

    const jsSrc = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionRoot, `./views/${this.viewId}.js`)
    );
    const webViewHtml = html`
      <html lang="en">
        <head>
          <title>Foo</title>
          <meta
            http-equiv="Content-Security-Policy"
            content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;"
          />
          <base
            href="${extensionRoot
              .with({ scheme: "vscode-resource" })
              .toString()}/"
          />
        </head>
        <body>
          <main id="root"></main>
          <script nonce="${nonce}" src="${jsSrc.toString()}"></script>
        </body>
      </html>
    `;

    webviewView.webview.html = webViewHtml;
  }
}
export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
