/** Utilities for managing traversing the Typescript AST */

import { getImaginaryTsDocComments } from "@imaginary-dev/typescript-transformer";
import * as ts from "typescript";

/** Find all imaginary functions in a source file */
export function findImaginaryFunctions(sourceFile: ts.SourceFile) {
  const imaginaryFunctions: ts.FunctionDeclaration[] = [];
  const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
    if (ts.isFunctionDeclaration(node)) {
      const tsDocComments = getImaginaryTsDocComments(node, sourceFile);
      if (tsDocComments.length === 1) {
        imaginaryFunctions.push(node);
      }
    }
    return ts.forEachChild(node, visitor);
  };

  visitor(sourceFile);
  return imaginaryFunctions;
}
