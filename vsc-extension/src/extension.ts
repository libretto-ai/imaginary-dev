// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { parse as parseCode } from "@babel/parser";
import traverse from "@babel/traverse";
import { playgroundParser } from "@imaginary-dev/babel-transformer";
import { ImaginaryFunctionDefinition } from "@imaginary-dev/util";
import * as vscode from "vscode";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "imaginary-programming" is now active?!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "imaginary-programming.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello World from Imaginary Programming!"
      );
    }
  );

  context.subscriptions.push(disposable);

  let dca = vscode.languages.registerCodeActionsProvider("typescript", {
    provideCodeActions(document, range, context, token) {
      console.log(
        "provideCodeActions in ",
        document?.uri,
        " from ",
        range,
        token
      );
      return [];
    },
  });
  context.subscriptions.push(dca);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getImaginaryFunctionDefinitions(
  code: string,
  includeNonImaginaryFunctions: boolean = false
): ImaginaryFunctionDefinition[] {
  const imaginaryFunctionDefinitions: ImaginaryFunctionDefinition[] = [];

  try {
    const ast = parseCode(code, {
      sourceType: "module",
      plugins: ["typescript"],
      attachComment: true,
    });

    const visitor = playgroundParser(
      imaginaryFunctionDefinitions,
      includeNonImaginaryFunctions
    );
    traverse(ast, visitor);
  } catch (e) {
    throw new SyntaxError(
      (e as Error).message ?? `${e}`,
      ErrorType.PARSE_ERROR
    );
  }
  return imaginaryFunctionDefinitions;
}
