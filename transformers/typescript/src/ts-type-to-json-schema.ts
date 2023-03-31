import { JSONSchema7 } from "json-schema";
import * as ts from "typescript";

export class NodeError extends Error {
  constructor(message: string, node: ts.Node) {
    const { line, character } = node
      .getSourceFile()
      .getLineAndCharacterOfPosition(node.pos);

    super(
      message +
        ` Error at line ${line}, character ${character} in '${
          node.getSourceFile().fileName
        }'`
    );
  }
}

export const tsTypeToJsonSchema = (
  type: ts.Type,
  typeChecker: ts.TypeChecker,
  node: ts.Node,
  path: string[] = []
): JSONSchema7 => {
  const readablePath = path.join(".") || "<root>";

  if (type.getFlags() & ts.TypeFlags.BooleanLiteral) {
    // It's weirdly hard to get the value of a boolean literal because boolean literals are not
    // represented by LiteralType but rather by IntrinsicType, which is not exposed to users.
    // I'm using a hack from this github issue:
    // https://github.com/microsoft/TypeScript/issues/22269#issue-301529155
    // See also this github issue: https://github.com/microsoft/TypeScript/issues/22269
    if (typeChecker.typeToString(type) === "true") return { const: true };
    if (typeChecker.typeToString(type) === "false") return { const: false };
    throw new NodeError(
      `Internal error trying to parse boolean literal with type ${type} and symbol ${type
        ?.getSymbol()
        ?.getName()}`,
      node
    );
  }
  if (type.getCallSignatures().length > 0) {
    throw new NodeError(
      `Imaginary function error: return values from imaginary functions must be JSON-serializable and cannot have function properties. (at path '${readablePath}')`,
      node
    );
  }
  if (type.isClass()) {
    throw new NodeError(
      `Imaginary function error: return values from imaginary functions must be JSON-serializable and cannot be classes. (at path '${readablePath}')`,
      node
    );
  }
  if (type.isIntersection()) {
    throw new NodeError(
      `Imaginary function error: we do not yet support intersection types. (at path '${readablePath}')`,
      node
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
      throw new NodeError(
        `Imaginary function error: we do not yet support computed enums. (at path '${readablePath}').`,
        node
      );
    }
    return {
      enum: literalTypesInEnum.map((type) => {
        if (type.isStringLiteral()) {
          return type.value;
        } else if (type.isNumberLiteral()) {
          return type.value;
        }
        throw new NodeError(
          `Internal imaginary function compilation error: encountered an enum type member which is not a string or number, which we don't support (at path '${readablePath}'). Please report this as a bug.`,
          node
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
    throw new NodeError(
      `Imaginary function error: we do not yet support literal types other than string or number. (at path '${readablePath}')`,
      node
    );
  }
  if (type.getFlags() & ts.TypeFlags.Null) {
    return { type: "null" };
  }
  if (type.getFlags() & ts.TypeFlags.Any) {
    throw new NodeError(
      `Imaginary function error: we do not yet support any types; just use string if you want something unstructured. (at path '${readablePath}')`,
      node
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
      throw new NodeError(
        `Imaginary function compiler: internal error of union type with only undefined members.`,
        node
      );
    }
    if (unionTypesWithoutUndefined.length === 1)
      return tsTypeToJsonSchema(
        unionTypesWithoutUndefined[0],
        typeChecker,
        node,
        path
      );
    // if we are unioning together { const: false } and { const: true }, replace that with
    // { type: "boolean" }
    const jsonSchemaTypesWithoutUndefined = unionTypesWithoutUndefined.map(
      (t) => tsTypeToJsonSchema(t, typeChecker, node, path)
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
    throw new NodeError(
      "Imaginary function compiler: intersection types are not supported.",
      node
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
      const typeArguments = type.typeArguments;
      if (typeof typeArguments === "undefined") {
        throw new NodeError(
          `Internal imaginary function compiler error: found an array with indeterminate item type, called ${typeChecker.typeToString(
            type
          )}. Please report this as a bug.`,
          node
        );
      }
      if (typeArguments.length !== 1) {
        throw new NodeError(
          `Internal imaginary function compiler error. Found an array with multiple or no types, called ${typeChecker.typeToString(
            type
          )}`,
          node
        );
      }
      return {
        type: "array",
        items: tsTypeToJsonSchema(typeArguments[0], typeChecker, node, [
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
      const { typeArguments, typeName } = getBuiltinTypeInfo(type);
      if (typeof typeArguments === "undefined") {
        throw new NodeError(
          `Internal imaginary function compiler error: found a ${typeName} with indeterminate item type, called ${typeChecker.typeToString(
            type
          )}. Please report this as a bug.`,
          node
        );
      }
      if (typeArguments.length !== 2) {
        throw new NodeError(
          `Internal imaginary function compiler error. Found a ${typeName} with too many or no types, called ${typeChecker.typeToString(
            type
          )}`,
          node
        );
      }
      if (!(typeArguments[0].getFlags() & ts.TypeFlags.String)) {
        throw new NodeError(
          `Imaginary function compiler: ${typeName} key type must be 'string'. (at path '${readablePath}')`,
          node
        );
      }
      return {
        type: "object",
        additionalProperties: tsTypeToJsonSchema(
          typeArguments[1],
          typeChecker,
          node,
          [...path, typeName ?? "???"]
        ),
      };
    }

    // object type
    const requiredPropNames = type
      .getProperties()
      .filter((symbol) => !(symbol.getFlags() & ts.SymbolFlags.Optional))
      .map((symbol) => symbol.getName());
    return {
      type: "object",
      properties: Object.fromEntries(
        type.getProperties().map((symbol) => {
          const symbolDeclaration = symbol.getDeclarations()?.[0];
          if (typeof symbolDeclaration === "undefined") {
            throw new NodeError(
              `Internal imaginary function compiler error: symbol '${symbol.getName()}' did not have a declaration. Please report this as a bug.`,
              node
            );
          }
          const propertyType = typeChecker.getTypeOfSymbolAtLocation(
            symbol,
            symbolDeclaration
          );

          return [
            symbol.getName(),
            tsTypeToJsonSchema(propertyType, typeChecker, node, [
              ...path,
              symbol.getName(),
            ]),
          ];
        })
      ),
      ...(requiredPropNames.length > 0 ? { required: requiredPropNames } : {}),
    };
  }

  throw new NodeError(
    `Imaginary function unexpected error: we do not yet support this type: ${typeChecker.typeToString(
      type
    )}. (at path '${readablePath}')`,
    node
  );
};

const isBuiltInWithName = (
  type: ts.Type,
  name: string
): type is ts.TypeReference => {
  return (
    isBuiltInSymbol(type.getSymbol(), name) ||
    isBuiltInSymbol(type.aliasSymbol, name)
  );
};

export function getBuiltinTypeInfo(type: ts.TypeReference) {
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

export const isArray = (type: ts.Type): type is ts.TypeReference => {
  return isBuiltInWithName(type, "Array");
};

export const isPromise = (type: ts.Type): type is ts.TypeReference => {
  return isBuiltInWithName(type, "Promise");
};
