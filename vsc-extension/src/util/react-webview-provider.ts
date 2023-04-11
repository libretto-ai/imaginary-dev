import html from "html-template-tag";
import * as vscode from "vscode";
import { RpcProvider } from "worker-rpc";
import { ImaginaryMessage } from "../../src-shared/messages";
import { State } from "./state";
import { TypedMap } from "./types";

export function registerWebView<R extends {}>(
  extensionContext: vscode.ExtensionContext,
  viewName: string,
  panelName: string,
  state: TypedMap<State>,
  rpcHandlers: R
) {
  const webviewProvider = new ReactWebViewProvider(
    extensionContext,
    panelName,
    state,
    rpcHandlers
  );
  extensionContext.subscriptions.push(
    vscode.window.registerWebviewViewProvider(viewName, webviewProvider)
  );
  return webviewProvider;
}

/** Generic WebviewViewProvider which wraps a react application */
export class ReactWebViewProvider<
  S extends object,
  R extends { [handlerName: string]: () => Promise<unknown> }
> implements vscode.WebviewViewProvider
{
  private _onDidAttachWebview = new vscode.EventEmitter<vscode.Webview>();
  private _onDidDetatchWebview = new vscode.EventEmitter<vscode.Webview>();
  private _onDidUpdateState = new vscode.EventEmitter<{
    provider: ReactWebViewProvider<S, R>;
    diff: Partial<S>;
  }>();
  onDidAttachWebview = this._onDidAttachWebview.event;
  onDidDetatchWebview = this._onDidDetatchWebview.event;
  onDidUpdateState = this._onDidUpdateState.event;
  viewId: string;
  extensionUri: vscode.Uri;
  webviewView?: vscode.WebviewView;
  rpcProvider: RpcProvider;

  localStateRef: TypedMap<S>;
  constructor(
    extensionContext: vscode.ExtensionContext,
    webviewId: string,
    state: TypedMap<S>,
    rpcHandlers: R
  ) {
    this.viewId = webviewId;
    this.extensionUri = extensionContext.extensionUri;
    this.localStateRef = state;
    this.rpcProvider = new RpcProvider((message, transfer) => {
      this.webviewView?.webview.postMessage({
        id: "rpc",
        params: [message, transfer],
      });
    });
    this.rpcProvider.registerRpcHandler(
      "read-state",
      async (itemKey: keyof S) => {
        console.log(`[extension ${this.viewId}] read-state`, itemKey);
        return this.localStateRef.get(itemKey);
      }
    );
    this.rpcProvider.registerRpcHandler(
      "write-state",
      async (partialState: Partial<S>) => {
        console.log(`[extension ${this.viewId}] write-state`, partialState);
        Object.entries(partialState).forEach(([key, value]) => {
          this.localStateRef.set(key as keyof S, value as S[keyof S]);
        });
        if (this.webviewView) {
          this._onDidUpdateState.fire({
            provider: this,
            diff: partialState,
          });
        }
      }
    );
    Object.entries(rpcHandlers).forEach(([messageId, handler]) => {
      this.rpcProvider.registerRpcHandler(messageId, handler);
    });
  }

  rpc<T = void, U = void>(id: string, payload?: T, transfer?: any): Promise<U> {
    return this.rpcProvider.rpc(id, payload, transfer);
  }

  /** Broadcast out to the webview that some state has changed */
  async sendStateUpdate(newState: Partial<S>) {
    return this.rpc("update-state", newState);
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    const extensionRoot = vscode.Uri.joinPath(
      this.extensionUri,
      "dist/vsc-extension/src"
    );
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionRoot],
    };
    const nonce = getNonce();

    const jsSrc = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionRoot, `./views/${this.viewId}.js`)
    );
    const webview = this.webviewView.webview;
    const webViewHtml = html`
      <html lang="en">
        <head>
          <title>React Webview Provider: ${this.viewId}</title>
          <meta
            http-equiv="Content-Security-Policy"
            content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;font-src ${webview.cspSource};"
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
    let messageDispose: vscode.Disposable | null =
      this.webviewView.webview.onDidReceiveMessage((e: ImaginaryMessage) => {
        if (e.id === "rpc") {
          const [message] = e.params;
          this.rpcProvider.dispatch(message);
        }
      });
    token.onCancellationRequested((e) => {
      console.log("disposing of provider", this.viewId);
      this._onDidDetatchWebview.fire(e);
      messageDispose?.dispose();
      messageDispose = null;
    });

    this._onDidAttachWebview.fire(webviewView.webview);
  }
}
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
