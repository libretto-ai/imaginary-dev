import {
  VSCodeCheckbox,
  VSCodeTextArea,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { JSONSchema7 } from "json-schema";
import React, { FC, useEffect, useRef } from "react";
import { ParameterDescriptor } from "../../src-shared/source-info";
import { safeJsonSchemaToTypeScriptText } from "../../src/util/schema";

export const ParamEditor: FC<{
  value: string;
  onChange: (arg0: any) => void;
  parameter: ParameterDescriptor;
  autoFocus?: boolean;
}> = ({ parameter, value, onChange, autoFocus }) => {
  const valueToDisplay = getEditableValue(parameter.schema, value);
  const tsType = safeJsonSchemaToTypeScriptText(parameter.schema);
  const label = (
    <div>
      <code>{parameter.name}</code> {parameter.schema && <span>{tsType}</span>}
    </div>
  );

  const inputRef = useRef<HTMLInputElement>();
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);
  if (tsType === "number") {
    return (
      <>
        {label}
        <VSCodeTextField
          autofocus={autoFocus}
          ref={inputRef as any}
          style={{ flex: 1, width: "100%", height: "auto" }}
          value={valueToDisplay}
          onChange={(e: any) =>
            onChange(getEditedValue(parameter.schema, e.target.value))
          }
        />
      </>
    );
  }
  if (tsType === "boolean") {
    return (
      <VSCodeCheckbox
        checked={!!value}
        onChange={(e) => onChange((e.target as any)?.checked)}
        ref={inputRef as any}
      >
        <code>{parameter.name}</code>
      </VSCodeCheckbox>
    );
  }
  return (
    <>
      {label}
      <VSCodeTextArea
        style={{ flex: 1, width: "100%", height: "auto" }}
        rows={7}
        resize="vertical"
        ref={inputRef as any}
        value={valueToDisplay}
        onChange={(e: any) =>
          onChange(getEditedValue(parameter.schema, e.target.value))
        }
      />
    </>
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
