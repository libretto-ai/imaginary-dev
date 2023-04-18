import {
  VSCodeTextArea,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { JSONSchema7 } from "json-schema";
import React, { FC } from "react";
import { ParameterDescriptor } from "../../src-shared/source-info";
import { safeJsonSchemaToTypeScriptText } from "../../src/util/schema";

export const ParamEditor: FC<{
  value: string;
  onChange: (arg0: any) => void;
  parameter: ParameterDescriptor;
}> = ({ parameter, value, onChange }) => {
  const valueToDisplay = getEditableValue(parameter.schema, value);
  const isNumber =
    safeJsonSchemaToTypeScriptText(parameter.schema) === "number";
  if (isNumber) {
    return (
      <VSCodeTextField
        style={{ flex: 1, width: "100%", height: "auto" }}
        value={valueToDisplay}
        onChange={(e: any) =>
          onChange(getEditedValue(parameter.schema, e.target.value))
        }
      />
    );
  }
  return (
    <VSCodeTextArea
      style={{ flex: 1, width: "100%", height: "auto" }}
      rows={7}
      resize="vertical"
      value={valueToDisplay}
      onChange={(e: any) =>
        onChange(getEditedValue(parameter.schema, e.target.value))
      }
    />
  );
};
function getEditableValue(schema: JSONSchema7 | undefined, value: any): string {
  switch (schema?.type) {
    case "string":
      return typeof value === "string" ? value : "";
    case "number":
    case "integer":
      return typeof value === "number" ? `${value}` : "0";
    case "boolean":
      // hack: should use checkbox or something
      return typeof value === "boolean" ? `${value}` : "false";
    case "null":
      return "null";
    default:
      break;
  }
  // All the rest are objects and arrays
  return JSON.stringify(value);
}

function getEditedValue(schema: JSONSchema7 | undefined, value: string): any {
  // TODO: use basic JSONSchema validation to validate here
  switch (schema?.type) {
    case "string":
      return typeof value === "string" ? value : "";
    case "number":
    case "integer":
      return typeof value === "number" ? value : parseInt(value);
    case "boolean":
      // hack should be using checkbox
      if (value === "true") {
        return true;
      }
      return false;
    case "null":
      return null;

    default:
      break;
  }
  try {
    return JSON.parse(value);
  } catch (ex) {
    console.warn("invalid value");
  }
  return value;
}
