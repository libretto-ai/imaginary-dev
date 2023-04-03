import * as ts from "typescript";
import * as vscode from "vscode";
import { SourceFileInfo, SourceFileMap } from "../src-shared/source-info";

export class ImaginaryFunctionProvider
  implements vscode.TreeDataProvider<ImaginaryTreeItem>
{
  printer = ts.createPrinter();

  private _sourceFiles: Readonly<SourceFileMap>;
  constructor(sourceFiles: Readonly<SourceFileMap>) {
    this._sourceFiles = sourceFiles;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    FunctionItem | undefined | null | void
  > = new vscode.EventEmitter<FunctionItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    FunctionItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  update(sources: Readonly<SourceFileMap>, refresh = true) {
    this._sourceFiles = sources;
    if (refresh) {
      this.refresh();
    }
  }

  getTreeItem(element: ImaginaryTreeItem) {
    return element;
  }
  getChildren(element?: ImaginaryTreeItem | undefined) {
    // Root items, so emit files
    if (!element) {
      return (
        Object.entries(this._sourceFiles)
          // ignore files without imaginary functions
          .filter(([, info]) => info.functions.length)
          .map(([fileName]) => {
            return new FileItem(fileName, this._sourceFiles[fileName]);
          })
      );
    }

    // file item, only emit if there are files
    if (element.itemType === "file") {
      const c = element.sourceFileInfo.functions.map((fn) => {
        const tooltip = this.printFunctionDefinition(fn, element);
        return new FunctionItem(
          fn,
          element.sourceFileInfo.sourceFile,
          fn.name?.text ?? "<unknown>",
          tooltip
        );
      });
      return c;
    }
    return [];
  }

  printFunctionDefinition(fn: ts.FunctionDeclaration, element: FileItem) {
    const tooltip = new vscode.MarkdownString();
    tooltip.appendCodeblock(
      this.printer.printNode(
        ts.EmitHint.Unspecified,
        fn,
        element.sourceFileInfo.sourceFile
      ),
      "typescript"
    );
    return tooltip;
  }
}

export class FunctionItem extends vscode.TreeItem {
  itemType = "function" as const;
  node: ts.FunctionDeclaration;
  sourceFile: ts.SourceFile;
  constructor(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
    public readonly label: string,
    public readonly tooltip: string | vscode.MarkdownString
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = tooltip;
    this.node = node;
    this.sourceFile = sourceFile;
    this.command = {
      command: "imaginary.clickFunction",
      title: "???",
      arguments: [this.node, this.sourceFile],
    };
  }
}

export class FileItem extends vscode.TreeItem {
  itemType = "file" as const;
  sourceFileInfo: SourceFileInfo;

  constructor(label: string, sourceFileInfo: SourceFileInfo) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.sourceFileInfo = sourceFileInfo;
  }
}
type ImaginaryTreeItem = FileItem | FunctionItem;
