import { NodePath, Visitor } from "@babel/core";
import { declare } from "@babel/helper-plugin-utils";
import {
  ExportDeclaration,
  ExportNamedDeclaration,
  FunctionDeclaration,
  TSDeclareFunction,
} from "@babel/types";
import { ImaginaryFunctionDefinition } from "@imaginary-dev/util";
import {
  getImaginaryFunctionDefinition,
  handleDeclaration,
} from "./function-builder";

interface Options {}
export default declare((api, opts: Options) => {
  api.assertVersion(7);

  return {
    name: "@imaginary-dev/babel-transformer",

    // inherits: syntaxTypeScript,
    visitor: {
      TSDeclareFunction(path) {
        processDeclaration(path, "TSDeclareFunction");
      },
      // DeclareFunction(path) {},
      FunctionDeclaration(path) {
        if (path.node.declare) {
          processDeclaration(path, "FunctionDeclaration");
        }
      },
      ExportDeclaration(path) {
        processDeclaration(path, "ExportDeclaration");
      },
      ExportNamedDeclaration(path) {
        processDeclaration(path, "ExportNamedDeclaration");
      },
      DeclareExportDeclaration(path) {},
    },
  };
});

export function playgroundParser(
  outputArray: ImaginaryFunctionDefinition[],
  includeNonImaginaryFunctions = false
): Visitor<{}> {
  return {
    TSDeclareFunction(path) {
      const imaginaryFunctionDefinition =
        getImaginaryFunctionDefinitionFromDeclaration(
          path,
          "TSDeclareFunction",
          includeNonImaginaryFunctions
        );
      if (imaginaryFunctionDefinition) {
        outputArray.push(imaginaryFunctionDefinition);
      }
    },
    // DeclareFunction(path) {},
    FunctionDeclaration(path) {
      if (path.node.declare) {
        const imaginaryFunctionDefinition =
          getImaginaryFunctionDefinitionFromDeclaration(
            path,
            "FunctionDeclaration",
            includeNonImaginaryFunctions
          );
        if (imaginaryFunctionDefinition) {
          outputArray.push(imaginaryFunctionDefinition);
        }
      }
    },
    ExportDeclaration(path) {
      const imaginaryFunctionDefinition =
        getImaginaryFunctionDefinitionFromDeclaration(
          path,
          "ExportDeclaration",
          includeNonImaginaryFunctions
        );
      if (imaginaryFunctionDefinition) {
        outputArray.push(imaginaryFunctionDefinition);
        // stop traversing, because the next child is a TSDeclareFunction, which will call
        // into this visitor again.
        path.skip();
      }
    },
    ExportNamedDeclaration(path) {
      const imaginaryFunctionDefinition =
        getImaginaryFunctionDefinitionFromDeclaration(
          path,
          "ExportNamedDeclaration",
          includeNonImaginaryFunctions
        );
      if (imaginaryFunctionDefinition) {
        outputArray.push(imaginaryFunctionDefinition);
        // stop traversing, because the next child is probably a ExportDeclaration, which will call
        // into this visitor again.
        path.skip();
      }
    },
    DeclareExportDeclaration(path) {},
  };
}

function getImaginaryFunctionDefinitionFromDeclaration(
  path:
    | NodePath<TSDeclareFunction>
    | NodePath<FunctionDeclaration>
    | NodePath<ExportDeclaration>
    | NodePath<ExportNamedDeclaration>,
  prefix: string,
  includeNonImaginaryFunctions: boolean
) {
  const comments = getCommentsForPath(path);
  return getImaginaryFunctionDefinition(
    prefix,
    comments,
    path.node,
    includeNonImaginaryFunctions
  );
}

function processDeclaration<
  T extends
    | ExportNamedDeclaration
    | ExportDeclaration
    | FunctionDeclaration
    | TSDeclareFunction
>(path: NodePath<T>, type: string) {
  const comments = getCommentsForPath(path);
  const newFunctionBody = handleDeclaration(type, path.node, comments);
  if (newFunctionBody) {
    path.replaceInline(newFunctionBody);
  }
}

export function getCommentsForPath(path: NodePath) {
  const previousSiblingPath = path.getPrevSibling();
  const previousSiblingNode = previousSiblingPath?.node;
  if (!previousSiblingNode || !previousSiblingNode?.leadingComments) {
    return path.node.leadingComments;
  }
  return path.node.leadingComments?.filter(
    (thisComment) => !previousSiblingNode.leadingComments?.includes(thisComment)
  );
}
