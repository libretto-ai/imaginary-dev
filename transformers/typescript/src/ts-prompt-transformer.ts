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
      let addedImports = false;
      const promptEngineIdentifier =
        ts.factory.createUniqueName("promptEngine");

      const visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isFunctionDeclaration(node)) {
          if (node.typeParameters) {
            throw new Error(
              "Imaginary function compile error: Functions cannot include type variables."
            );
          }
          const imaginaryComments = getImaginaryTsDocComments(node, sourceFile);

          // maybe in the future we could merge multiple @imaginary comments, but for now we throw an
          // error.
          if (imaginaryComments.length > 1) {
            throw new Error(
              `Imaginary function compile error: imaginary functions should only have one @imaginary TsDoc comment, but the function "${node.getText(
                sourceFile
              )}" had ${imaginaryComments.length} @imaginary TsDoc comments.`
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

            const paramsAsStrings = node.parameters.map((paramDeclaration) => ({
              name: paramDeclaration.name.getText(),
              type: paramDeclaration.type
                ? typeChecker.getTypeAtLocation(paramDeclaration.type)
                : undefined,
            }));

            return getASTForName(
              promptEngineIdentifier,
              imaginaryComment,
              functionName,
              paramsAsStrings,
              getBottomedOutType(promisedType, typeChecker),
              promisedType,
              typeChecker
            );
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
    throw new Error(
      `Internal compilation error: could not find the call signature for "${typeChecker.typeToString(
        type
      )}" for this node. Please file a bug with the code that caused this compilation error.`
    );
  }

  const returnType = type
    .getCallSignatures()[0]
    .getReturnType() as ts.TypeReference;

  // Check to make sure that the return value is a Promise. This is how you make
  // async functions in TypeScript function declarations.
  if (!isPromise(returnType)) {
    throw new Error(
      `Imaginary function compilation error: all imaginary functions must have a return type of Promise<T>, but the return type of ${typeChecker.typeToString(
        type
      )} is not a Promise.`
    );
  }

  // Find the type encased in the promise.
  if (
    typeof returnType.typeArguments === "undefined" ||
    returnType.typeArguments.length === 0
  ) {
    throw new Error(
      `Imaginary function compilation error: all imaginary functions must have a return type of Promise<T>, where T is the wrapped type that is returned by the function. This imaginary function has no wrapped type.`
    );
  }
  if (returnType.typeArguments.length > 1) {
    throw new Error(
      `Imaginary function compilation error: all imaginary functions must have a return type of Promise<T>, with one type wrapped by a Promise. This imaginary function has more than one type wrapped by the Promise.`
    );
  }

  const promisedType = returnType.typeArguments[0] as ts.TypeReference;

  if (!isAllowedType(promisedType)) {
    throw new Error(
      `Imaginary function compilation error: return types must be inlined.`
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
function getBottomedOutType(type: ts.Type, typeChecker: ts.TypeChecker) {
  // It's admittedly a little silly to take a TypeScript AST type and convert it into JSON Schema in
  // order to turn it back into TypeScript text, but that's the easiest path I have right now, given that
  // TS ASTs are so complicated.
  return jsonSchemaToTypeScriptText(tsTypeToJsonSchema(type, typeChecker));
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

  const returnTypeText = getBottomedOutType(promisedReturnType, typeChecker);

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
    throw new Error(
      `Internal imaginary function compilation error: could not retrieve the function name of ${typeChecker.typeToString(
        type
      )}. Please report this as a bug.`
    );
  }
  return functionName;
}

function getImaginaryTsDocComments(
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

const tsTypeToJsonSchema = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
  path: string[] = []
): any => {
  const readablePath = path.join(".") || "<root>";

  if (type.getFlags() & ts.TypeFlags.BooleanLiteral) {
    // It's weirdly hard to get the value of a boolean literal because boolean literals are not
    // represented by LiteralType but rather by IntrinsicType, which is not exposed to users.
    // I'm using a hack from this github issue:
    // https://github.com/microsoft/TypeScript/issues/22269#issue-301529155
    // See also this github issue: https://github.com/microsoft/TypeScript/issues/22269
    if (typeChecker.typeToString(type) === "true") return { const: true };
    if (typeChecker.typeToString(type) === "false") return { const: false };
    throw new Error(
      `Internal error trying to parse boolean literal with type ${type} and symbol ${type
        ?.getSymbol()
        ?.getName()}`
    );
  }
  if (type.getCallSignatures().length > 0) {
    throw new Error(
      `Imaginary function error: return values from imaginary functions must be JSON-serializable and cannot have function properties. (at path '${readablePath}')`
    );
  }
  if (type.isClass()) {
    throw new Error(
      `Imaginary function error: return values from imaginary functions must be JSON-serializable and cannot be classes. (at path '${readablePath}')`
    );
  }
  if (type.isIntersection()) {
    throw new Error(
      `Imaginary function error: we do not yet support intersection types. (at path '${readablePath}')`
    );
  }
  if (type.getFlags() & ts.TypeFlags.EnumLike) {
    // a multi-valued constant enum is a union type of all the literal values in it with its constituent
    // unioned types as literals that are accessed at .types, but a single-valued constant
    // enum is just a literal value of the only enum value. we need to standardize this into one array.
    let literalTypesInEnum: ts.Type[] = [];
    if (type.isUnion()) {
      literalTypesInEnum = type.types;
    } else if (type.isLiteral()) {
      literalTypesInEnum = [type];
    } else {
      throw new Error(
        `Imaginary function error: we do not yet support computed enums. (at path '${readablePath}').`
      );
    }
    return {
      enum: literalTypesInEnum.map((type) => {
        if (type.isStringLiteral()) {
          return type.value;
        } else if (type.isNumberLiteral()) {
          return type.value;
        }
        throw new Error(
          `Internal imaginary function compilation error: encountered an enum type member which is not a string or number, which we don't support (at path '${readablePath}'). Please report this as a bug.`
        );
      }),
    };
  }
  // single-value enums are classified **both** as EnumLiteral **and** NumberLiteral, so if this block is above the Enum block,
  // it will grab hold of single-valued numeric enums.
  if (type.isLiteral()) {
    if (type.isStringLiteral()) {
      return { const: type.value };
    } else if (type.isNumberLiteral()) {
      return { const: type.value };
    }
    throw new Error(
      `Imaginary function error: we do not yet support literal types other than string or number. (at path '${readablePath}')`
    );
  }
  if (type.getFlags() & ts.TypeFlags.Null) {
    return { type: "null" };
  }
  if (type.getFlags() & ts.TypeFlags.Any) {
    throw new Error(
      `Imaginary function error: we do not yet support any types; just use string if you want something unstructured. (at path '${readablePath}')`
    );
  }

  if (type.getFlags() & ts.TypeFlags.Boolean) {
    // this block must be above the union bloc, because boolean
    // is implemented as a union of true and false
    return { type: "boolean" };
  }

  if (type.isUnion()) {
    // In strictNullChecks mode, optional types get sent in as (type | undefined), but we already
    // handle that in the object type with the required array. So we do a special thing here where
    // we strip out the undefined type, and if there's only one type left, we don't do a union at all.
    const unionTypesWithoutUndefined = type.types.filter(
      (type) => !(type.getFlags() & ts.TypeFlags.Undefined)
    );
    if (unionTypesWithoutUndefined.length === 0) {
      throw new Error(
        `Imaginary function compiler: internal error of union type with only undefined members.`
      );
    }
    if (unionTypesWithoutUndefined.length === 1)
      return tsTypeToJsonSchema(
        unionTypesWithoutUndefined[0],
        typeChecker,
        path
      );
    // if we are unioning together { const: false } and { const: true }, replace that with
    // { type: "boolean" }
    const jsonSchemaTypesWithoutUndefined = unionTypesWithoutUndefined.map(
      (t) => tsTypeToJsonSchema(t, typeChecker, path)
    );
    const falseTypeIndex = jsonSchemaTypesWithoutUndefined.findIndex(
      (jsonSchema) => jsonSchema?.const === false
    );
    const trueTypeIndex = jsonSchemaTypesWithoutUndefined.findIndex(
      (jsonSchema) => jsonSchema?.const === true
    );
    if (falseTypeIndex !== -1 && trueTypeIndex !== -1) {
      jsonSchemaTypesWithoutUndefined.splice(falseTypeIndex, 1, {
        type: "boolean",
      });
      jsonSchemaTypesWithoutUndefined.splice(trueTypeIndex, 1);
    }
    return {
      anyOf: jsonSchemaTypesWithoutUndefined,
    };
  }
  if (type.isIntersection()) {
    throw new Error(
      "Imaginary function compiler: intersection types are not supported."
    );
  }
  if (type.getFlags() & ts.TypeFlags.String) {
    return { type: "string" };
  }
  if (type.getFlags() & ts.TypeFlags.Number) {
    return { type: "number" };
  }
  if (type.getFlags() & ts.TypeFlags.Object) {
    if (isArray(type)) {
      const typeArguments = (type as ts.TypeReference).typeArguments;
      if (typeof typeArguments === "undefined") {
        throw new Error(
          `Internal imaginary function compiler error: found an array with indeterminate item type, called ${typeChecker.typeToString(
            type
          )}. Please report this as a bug.`
        );
      }
      if (typeArguments.length !== 1) {
        throw new Error(
          `Internal imaginary function compiler error. Found an array with multiple or no types, called ${typeChecker.typeToString(
            type
          )}`
        );
      }
      return {
        type: "array",
        items: tsTypeToJsonSchema(typeArguments[0], typeChecker, [
          ...path,
          "[]",
        ]),
      };
    }
    if (
      isBuiltInWithName(type, "Record")
      // TODO: enable when Map rehydration is ready
      // || isBuiltInWithName(type, "Map")
    ) {
      const { typeArguments, typeName } = getBuiltinTypeInfo(
        type as ts.TypeReference
      );
      if (typeof typeArguments === "undefined") {
        throw new Error(
          `Internal imaginary function compiler error: found a ${typeName} with indeterminate item type, called ${typeChecker.typeToString(
            type
          )}. Please report this as a bug.`
        );
      }
      if (typeArguments.length !== 2) {
        throw new Error(
          `Internal imaginary function compiler error. Found a ${typeName} with too many or no types, called ${typeChecker.typeToString(
            type
          )}`
        );
      }
      if (!(typeArguments[0].getFlags() & ts.TypeFlags.String)) {
        throw new Error(
          `Imaginary function compiler: ${typeName} key type must be 'string'. (at path '${readablePath}')`
        );
      }
      return {
        type: "object",
        additionalProperties: tsTypeToJsonSchema(
          typeArguments[1],
          typeChecker,
          [...path, typeName ?? "???"]
        ),
      };
    }

    // object type
    const requiredPropNames = type
      .getProperties()
      .filter((symbol) => !(symbol.getFlags() & ts.SymbolFlags.Optional))
      .map((symbol) => symbol.getName());
    return Object.assign(
      {
        type: "object",
        properties: Object.fromEntries(
          type.getProperties().map((symbol) => {
            const symbolDeclaration = symbol.getDeclarations()?.[0];
            if (typeof symbolDeclaration === "undefined") {
              throw new Error(
                `Internal imaginary function compiler error: symbol '${symbol.getName()}' did not have a declaration. Please report this as a bug.`
              );
            }
            const propertyType = typeChecker.getTypeOfSymbolAtLocation(
              symbol,
              symbolDeclaration
            );

            return [
              symbol.getName(),
              tsTypeToJsonSchema(propertyType, typeChecker, [
                ...path,
                symbol.getName(),
              ]),
            ];
          })
        ),
      },
      requiredPropNames.length > 0 ? { required: requiredPropNames } : {}
    );
  }
  throw new Error(
    `Imaginary function unexpected error: we do not yet support this type: ${typeChecker.typeToString(
      type
    )}. (at path '${readablePath}')`
  );
};

const isArray = (type: ts.Type): boolean => {
  return isBuiltInWithName(type, "Array");
};
const isPromise = (type: ts.Type): boolean => {
  return isBuiltInWithName(type, "Promise");
};

const isBuiltInWithName = (type: ts.Type, name: string): boolean => {
  return (
    isBuiltInSymbol(type.getSymbol(), name) ||
    isBuiltInSymbol(type.aliasSymbol, name)
  );
};

function getBuiltinTypeInfo(type: ts.TypeReference) {
  // sometimes type arguments hide out on the alias:
  const { aliasTypeArguments, typeArguments } = type;
  if (aliasTypeArguments) {
    return {
      typeArguments: aliasTypeArguments,
      typeName: type.aliasSymbol!.getName(),
    };
  }
  return {
    typeArguments,
    typeName: type.getSymbol()?.getName(),
  };
}

function isBuiltInSymbol(symbol: ts.Symbol | undefined, name: string): boolean {
  // there may be a better way to do this, but I've spent quite a lot of time trying to figure this
  // out, and it's time to do the quick way.
  // this is inspired by https://stackoverflow.com/questions/67537309/typescript-compile-api-detect-builtins-like-math
  return (
    symbol?.getName() === name &&
    !!symbol
      ?.getDeclarations()
      ?.some((s) =>
        s.getSourceFile().fileName.includes("/node_modules/typescript/lib/")
      )
  );
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
  typeChecker: ts.TypeChecker
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
                      type: type ? tsTypeToJsonSchema(type, typeChecker) : {},
                    };
                  })
                ),
                jsonObjectToTsAst(
                  tsTypeToJsonSchema(promisedType, typeChecker)
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
