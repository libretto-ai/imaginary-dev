// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import html from "html-template-tag";
import { relative } from "path";
import * as vscode from "vscode";
import { focusNode } from "./editor-utils";
import { ImaginaryFunctionProvider } from "./function-tree-provider";
import { SourceFileMap } from "./source-info";
import { removeFile, updateFile } from "./source-utils";

export function getRelativePathToProject(absPath: string) {
  const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (projectPath) {
    return relative(projectPath, absPath);
  }
  return absPath;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(extensionContext: vscode.ExtensionContext) {
  const ipChannel = vscode.window.createOutputChannel(
    "Imaginary Programming Extension"
  );
  // Log output to the channel
  console.log = (message) => {
    ipChannel.appendLine(message);
  };

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "imaginary-programming" is now active!'
  );

  let sources: Readonly<SourceFileMap> = {};

  const functionTreeProvider = new ImaginaryFunctionProvider(sources);
  const treeView = vscode.window.createTreeView("functions", {
    treeDataProvider: functionTreeProvider,
  });
  vscode.commands.registerCommand("imaginary.clickFunction", focusNode);

  extensionContext.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      console.info("onDidChangeTextDocument", e.document.fileName, e.reason);
      sources = updateFile(sources, e.document);
      functionTreeProvider.update(sources);
    })
  );

  extensionContext.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      console.info("onDidOpenTextDocument", document.fileName);
      sources = updateFile(sources, document);

      functionTreeProvider.update(sources);
    })
  );
  extensionContext.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      console.info("onDidCloseTextDocument", document.fileName);
      sources = removeFile(document, sources);
      functionTreeProvider.update(sources);
    })
  );

  sources = initializeOpenEditors(sources, functionTreeProvider);

  console.log("adding webview...");
  extensionContext.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "imaginary.currentfunctions",
      new ReactWebViewProvider(extensionContext, "function-panel")
    )
  );
}

class ReactWebViewProvider implements vscode.WebviewViewProvider {
  viewId: string;
  extensionContext: vscode.ExtensionContext;
  webviewView?: vscode.WebviewView;
  constructor(extensionContext: vscode.ExtensionContext, webviewId: string) {
    this.viewId = webviewId;
    this.extensionContext = extensionContext;
  }

  async postMessage<T extends any[]>(messageId: string, params: T) {
    if (!this.webviewView) {
      throw new Error("webview has not been initialized");
    }
    return this.webviewView.webview.postMessage({
      id: messageId,
      params,
    });
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
      console.log("got message from webview:", e);
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
/**
 * onDidOpenTextDocument does not fire for editors that are already open when
 * the extension initializes, so we do it here.
 */
function initializeOpenEditors(
  sources: Readonly<SourceFileMap>,
  functionTreeProvider: ImaginaryFunctionProvider
) {
  let updated = false;
  vscode.window.visibleTextEditors.forEach(({ document }) => {
    sources = updateFile(sources, document);
    updated = true;
  });
  if (updated) {
    functionTreeProvider.update(sources);
  }
  return sources;
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
