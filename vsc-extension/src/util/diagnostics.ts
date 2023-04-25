import ts from "typescript";
import vscode from "vscode";
import { getRelativePathToProject } from "./editor";
import { SourceFileMap } from "./ts-source";

export function updateDiagnostics(
  sources: SourceFileMap,
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
) {
  const modifiedFile = getRelativePathToProject(document.fileName);
  const diagnostics: vscode.Diagnostic[] = [];
  if (sources && modifiedFile in sources) {
    const sourceFileInfo = sources[modifiedFile];
    sourceFileInfo.functions.forEach((fn) => {
      const start = document.positionAt(fn.getStart(sourceFileInfo.sourceFile));
      const end = document.positionAt(fn.getEnd());
      const returnType = fn.type;

      // TODO: Unify this error handling with tsNodeToJsonSchema or some other common path

      if (!returnType) {
        diagnostics.push(
          makeDiagnostic(
            start,
            end,
            "Imaginary function is missing return type.",
            vscode.DiagnosticSeverity.Warning
          )
        );

        return;
      }
      if (
        !ts.isTypeReferenceNode(returnType) ||
        !ts.isIdentifier(returnType.typeName) ||
        returnType.typeName.text !== "Promise"
      ) {
        diagnostics.push(
          makeDiagnostic(
            start,
            end,
            "Imaginary function return type must be a Promise."
          )
        );
        return;
      }
      const resolvedType = returnType.typeArguments?.[0];
      if (
        !resolvedType ||
        (ts.isTypeReferenceNode(resolvedType) && !isRecordType(resolvedType))
      ) {
        diagnostics.push(
          makeDiagnostic(
            start,
            end,
            "Imaginary function return type must be an inline type."
          )
        );
      }
      if (fn.typeParameters?.length) {
        diagnostics.push(
          makeDiagnostic(
            start,
            end,
            "Imaginary function cannot have type parameters"
          )
        );
      }
    });
  }
  collection.set(document.uri, diagnostics);
}

function isRecordType(node: ts.TypeReferenceNode) {
  return ts.isIdentifier(node.typeName) && node.typeName.text === "Record";
}

function makeDiagnostic(
  start: vscode.Position,
  end: vscode.Position,
  message: string,
  severity = vscode.DiagnosticSeverity.Error
) {
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(start, end),
    message,
    severity
  );
  diagnostic.code = {
    target: vscode.Uri.parse(
      "https://imaginary.dev/docs/writing-an-imaginary-function"
    ),
    value: "docs",
  };
  return diagnostic;
}
