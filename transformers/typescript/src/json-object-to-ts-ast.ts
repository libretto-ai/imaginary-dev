import * as ts from "typescript";

export default function jsonObjectToTsAst(jsonObject: any): ts.Expression {
  if (jsonObject === null) {
    return ts.factory.createNull();
  }
  if (jsonObject === true) {
    return ts.factory.createTrue();
  }
  if (jsonObject === false) {
    return ts.factory.createFalse();
  }
  if (typeof jsonObject === "string") {
    return ts.factory.createStringLiteral(jsonObject);
  }
  if (typeof jsonObject === "number") {
    return ts.factory.createNumericLiteral(jsonObject);
  }
  if (Array.isArray(jsonObject)) {
    return ts.factory.createArrayLiteralExpression(
      jsonObject.map((item) => jsonObjectToTsAst(item)),
      true
    );
  }
  if (typeof jsonObject === "object") {
    return ts.factory.createObjectLiteralExpression(
      Object.entries(jsonObject).map(
        ([key, value]) =>
          ts.factory.createPropertyAssignment(
            ts.factory.createStringLiteral(key),
            jsonObjectToTsAst(value)
          ),
        true
      )
    );
  }
  throw new Error(
    `Cannot serialize item ${jsonObject} because it is not a proper JSON-serializable object (comprised solely of null, boolean, string, number, array, or simple object).`
  );
}
