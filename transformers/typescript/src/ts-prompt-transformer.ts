import {
  isImaginaryCommentBlock,
  jsonSchemaToTypeScriptText,
  makeTSDocParser,
} from "@imaginary-dev/util";
import {
  TSDocConfiguration,
  TSDocParser,
  TSDocTagDefinition,
  TSDocTagSyntaxKind,
} from "@microsoft/tsdoc";
import * as ts from "typescript";
import jsonObjectToTsAst from "./json-object-to-ts-ast";
import {
  isPromise,
  NodeError,
  tsTypeToJsonSchema,
} from "./ts-type-to-json-schema";

const tsdocConfig: TSDocConfiguration = new TSDocConfiguration();
tsdocConfig.addTagDefinition(
  new TSDocTagDefinition({
    tagName: "@imaginary",
    syntaxKind: TSDocTagSyntaxKind.ModifierTag,
    allowMultiple: false,
  })
);

const transformer =
  (program: ts.Program): ts.TransformerFactory<ts.SourceFile> =>
  (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      if (sourceFile.fileName.includes("node_modules/")) {
        return sourceFile;
      }
      const promptEngineIdentifier =
        ts.factory.createUniqueName("promptEngine");

      let addedImports = false;

      const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isFunctionDeclaration(node)) {
          const imaginaryComments = getImaginaryTsDocComments(node, sourceFile);

          if (imaginaryComments.length > 0) {
            if (node.typeParameters) {
              throw new NodeError(
                `Imaginary function compile error: Functions cannot include type variables.`,
                node
              );
            }
            // maybe in the future we could merge multiple @imaginary comments, but for now we throw an
            // error.
            if (imaginaryComments.length > 1) {
              throw new NodeError(
                `Imaginary function compile error: imaginary functions should only have one @imaginary TsDoc comment, but the function "${node.getText(
                  sourceFile
                )}" had ${imaginaryComments.length} @imaginary TsDoc comments.`,
                node
              );
            }

            if (imaginaryComments.length === 1) {
              const imaginaryComment = imaginaryComments[0];

              const paramNames = node.parameters.map((paramDeclaration) =>
                paramDeclaration.name.getText()
              );

              const typeChecker = program.getTypeChecker();
              const type = typeChecker.getTypeAtLocation(node);

              const promisedType = getPromisedReturnType(node, typeChecker);

              addedImports = true;

              const functionName = getFunctionName(node, typeChecker);

              const paramsAsStrings = node.parameters.map(
                (paramDeclaration) => ({
                  name: paramDeclaration.name.getText(),
                  type: paramDeclaration.type
                    ? typeChecker.getTypeAtLocation(paramDeclaration.type)
                    : undefined,
                })
              );

              return getASTForName(
                promptEngineIdentifier,
                imaginaryComment,
                functionName,
                paramsAsStrings,
                getBottomedOutType(promisedType, typeChecker, node),
                promisedType,
                typeChecker,
                node
              );
            }
          }
        }
        return ts.visitEachChild(node, visitor, context);
      };

      let transformedSource = ts.visitNode(sourceFile, visitor);
      if (addedImports) {
        const importDeclaration = ts.factory.createImportDeclaration(
          undefined,
          ts.factory.createImportClause(
            false,
            undefined,
            ts.factory.createNamespaceImport(promptEngineIdentifier)
          ),
          ts.factory.createStringLiteral("@imaginary-dev/runtime")
        );

        transformedSource = ts.factory.updateSourceFile(transformedSource, [
          importDeclaration,
          // include all of the source statements below
          ...transformedSource.statements,
        ]);

        // this is very hacky! it turns out that typescript only checks to see if
        // a module has imports when it initially parses the file (before any transformations).
        // That check is stored in sourceFile.externalModuleIndicator, which is a pointer to the
        // node that indicates that this is a module with imports.
        // The module ==> CommonJS transformer then depends on sourceFile.externalModuleIndicator
        // to decide whether to the CommonJS boilerplate is needed or not.
        // So, if you send in a file with no imports to this transformer and the transformer ends
        // up adding an import statement, the module ==> CommonJS transformer will not realize
        // that this module needs to be transformed unless you *also* set the external module
        // indicator with this internal method.
        // if this fails in some versions (or future versions) of TypeScript, we could always
        // look at the compiler options and output a require() call rather than module import
        // when the output format is CommonJS.
        (transformedSource as any)?.setExternalModuleIndicator(
          transformedSource
        );
      }

      return transformedSource;
    };
  };

function getPromisedReturnType(
  node: ts.FunctionDeclaration,
  typeChecker: ts.TypeChecker
) {
  const type = typeChecker.getTypeAtLocation(node);

  const callSignature = type
    .getCallSignatures()
    .find((signature) => signature.declaration === node);

  if (!callSignature) {
    throw new NodeError(
      `Internal compilation error: could not find the call signature for "${typeChecker.typeToString(
        type
      )}" for this node. Please file a bug with the code that caused this compilation error.`,
      node
    );
  }

  const returnType = type.getCallSignatures()[0].getReturnType();

  // Check to make sure that the return value is a Promise. This is how you make
  // async functions in TypeScript function declarations.
  if (!isPromise(returnType)) {
    throw new NodeError(
      `Imaginary function compilation error: all imaginary functions must have a return type of Promise<T>, but the return type of ${typeChecker.typeToString(
        type
      )} is not a Promise.`,
      node
    );
  }

  // Find the type encased in the promise.
  if (
    typeof returnType.typeArguments === "undefined" ||
    returnType.typeArguments.length === 0
  ) {
    throw new NodeError(
      `Imaginary function compilation error: all imaginary functions must have a return type of Promise<T>, where T is the wrapped type that is returned by the function. This imaginary function has no wrapped type.`,
      node
    );
  }
  if (returnType.typeArguments.length > 1) {
    throw new NodeError(
      `Imaginary function compilation error: all imaginary functions must have a return type of Promise<T>, with one type wrapped by a Promise. This imaginary function has more than one type wrapped by the Promise.`,
      node
    );
  }

  const promisedType = returnType.typeArguments[0] as ts.TypeReference;

  if (!isAllowedType(promisedType)) {
    throw new NodeError(
      `Imaginary function compilation error: return types must be inlined.`,
      node
    );
  }
  return promisedType;
}

function isAllowedType(t: ts.TypeReference) {
  return (
    isAllowedSymbol(t.aliasSymbol) &&
    isAllowedSymbol(t.getSymbol()) &&
    (!t.typeArguments ||
      t.typeArguments.every((t) => isAllowedType(t as ts.TypeReference)))
  );
}

function isAllowedSymbol(symbol: ts.Symbol | undefined) {
  if (!symbol) {
    return true;
  }
  // TODO: is there a way to get if something is a reserved symbol?
  return ["__type", "Array", "Record"].includes(symbol.getName());
}

// takes in a JSON-compatible type and follows aliases and interfaces
function getBottomedOutType(
  type: ts.Type,
  typeChecker: ts.TypeChecker,
  node: ts.Node
) {
  // It's admittedly a little silly to take a TypeScript AST type and convert it into JSON Schema in
  // order to turn it back into TypeScript text, but that's the easiest path I have right now, given that
  // TS ASTs are so complicated.
  return jsonSchemaToTypeScriptText(
    tsTypeToJsonSchema(type, typeChecker, node)
  );
}

// The version of the function declaration that we need to hand to GPT for imaginary implementation is
// different than the one that user handed us, in the following ways:
//
// * no need to include "export" if present.
// * no need to include Promise in the return type.
// * types for both return and parameters should be JSON-compatible raw types, not aliased or named types.
function getGptVersionOfFunctionDeclaration(
  node: ts.FunctionDeclaration,
  typeChecker: ts.TypeChecker
) {
  const functionName = getFunctionName(node, typeChecker);

  const paramNamesAndTypes = node.parameters.map((paramDeclaration) => ({
    name: paramDeclaration.name.getText(),
    type: paramDeclaration.type,
  }));

  let promisedReturnType = getPromisedReturnType(node, typeChecker);

  const returnTypeText = getBottomedOutType(
    promisedReturnType,
    typeChecker,
    node
  );

  return `declare function ${functionName}(${paramNamesAndTypes.map(
    ({ name, type }) =>
      type ? `${name}: ${typeChecker.getTypeAtLocation(type)}` : name
  )}) : ${returnTypeText}`;
}

function getFunctionName(
  node: ts.FunctionDeclaration,
  typeChecker: ts.TypeChecker
): string {
  const type = typeChecker.getTypeAtLocation(node);
  const functionName = node.name?.escapedText.toString();
  if (typeof functionName === "undefined") {
    throw new NodeError(
      `Internal imaginary function compilation error: could not retrieve the function name of ${typeChecker.typeToString(
        type
      )}. Please report this as a bug.`,
      node
    );
  }
  return functionName;
}

export function getImaginaryTsDocComments(
  functionDeclationNode: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile
): string[] {
  let imaginaryComment = null;
  const result: string[] = [];
  for (let { pos, end } of ts.getLeadingCommentRanges(
    sourceFile.getFullText(),
    functionDeclationNode.pos
  ) ?? []) {
    const comment = sourceFile.getFullText().slice(pos, end);

    const tsdocParser: TSDocParser = makeTSDocParser();
    const parsedComment = tsdocParser.parseString(comment);

    // Parse the function comment with TSDoc
    const isImaginary = isImaginaryCommentBlock(parsedComment);

    if (isImaginary) {
      result.push(comment);
    }
  }
  return result;
}

// this was generated (and then extensively modified) from https://ts-creator.js.org/ for
// the following code:
//
// import * as  __runPrompt from "@imaginary-dev/runtime";
// export  async function myfunc (parameters) {
//     return await __runPrompt.default("prompt", parameters);
// }
function getASTForName(
  promptEngineIdentifier: ts.Identifier,
  imaginaryComment: string,
  functionName: string,
  paramTypes: { name: string; type?: ts.Type }[],
  returnType: string,
  promisedType: ts.Type,
  typeChecker: ts.TypeChecker,
  node: ts.Node
) {
  return ts.factory.createFunctionDeclaration(
    [
      ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
      ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword),
    ],
    undefined,
    functionName,
    undefined,
    paramTypes.map(({ name: paramName }) =>
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier(paramName),
        undefined,
        undefined,
        undefined
      )
    ),
    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createAwaitExpression(
            ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                promptEngineIdentifier,
                "callImaginaryFunction"
              ),
              undefined,
              [
                ts.factory.createStringLiteral(imaginaryComment),
                ts.factory.createStringLiteral(functionName),
                jsonObjectToTsAst(
                  paramTypes.map(({ name, type }) => {
                    return {
                      name,
                      type: type
                        ? tsTypeToJsonSchema(type, typeChecker, node)
                        : {},
                    };
                  })
                ),
                jsonObjectToTsAst(
                  tsTypeToJsonSchema(promisedType, typeChecker, node)
                ),
                ts.factory.createObjectLiteralExpression(
                  paramTypes.map(({ name: paramName }) =>
                    ts.factory.createShorthandPropertyAssignment(
                      ts.factory.createIdentifier(paramName),
                      undefined
                    )
                  ),
                  false
                ),
              ]
            )
          )
        ),
      ],
      true
    )
  );
}
export default transformer;
