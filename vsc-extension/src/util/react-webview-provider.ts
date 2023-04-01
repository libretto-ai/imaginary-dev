import html from "html-template-tag";
import * as vscode from "vscode";

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

/** Generic WebviewViewProvider which wraps a react application */
export class ReactWebViewProvider implements vscode.WebviewViewProvider {
  private _onDidAttachWebview = new vscode.EventEmitter<vscode.Webview>();
  private _onDidDetatchWebview = new vscode.EventEmitter<vscode.Webview>();
  onDidAttachWebview = this._onDidAttachWebview.event;
  onDidDetatchWebview = this._onDidDetatchWebview.event;
  viewId: string;
  extensionUri: vscode.Uri;
  webviewView?: vscode.WebviewView;
  constructor(extensionContext: vscode.ExtensionContext, webviewId: string) {
    this.viewId = webviewId;
    this.extensionUri = extensionContext.extensionUri;
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    token.onCancellationRequested((e) => {
      console.log("disposing of provider", this.viewId);
      this._onDidDetatchWebview.fire(e);
    });
    const extensionRoot = vscode.Uri.joinPath(this.extensionUri, "dist");
    this.webviewView = webviewView;
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
          <title>React Webview Provider: ${this.viewId}</title>
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
    this._onDidAttachWebview.fire(webviewView.webview);
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
