"use client";
import { validateParameter } from "@/state/scenarios";
import { WarningIcon } from "@chakra-ui/icons";
import { Input, Switch, Text, Tooltip, useToken } from "@chakra-ui/react";
import { JSONSchema7 } from "json-schema";
import dynamic from "next/dynamic";
import { FC, useState } from "react";

export const CodeEditor = dynamic(
  () => import("@uiw/react-textarea-code-editor").then((mod) => mod.default),
  { ssr: false }
);

export const ParamEditor: FC<{
  schema: JSONSchema7;
  value: any;
  onChange: (value: string) => void;
}> = ({ schema, value, onChange }) => {
  const codeBgColor = useToken("colors", "gray.50");

  const name = schema.title;
  const displayName = `${schema.title}${
    (schema as Record<string, any>).is_required ? "" : " (optional)"
  }`;
  switch (schema.type) {
    case "string":
      return (
        <>
          <Text alignSelf="center">{displayName}</Text>
          <Input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      );
    case "number":
      return (
        <>
          <Text alignSelf="center">{displayName}</Text>
          <Input
            type="number"
            value={value ?? 0}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      );
    case "boolean":
      return (
        <>
          <Text alignSelf="center">{displayName}</Text>
          <Switch
            isChecked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          />
        </>
      );

    default:
      return (
        <JSONEditor
          displayName={displayName}
          schema={schema}
          value={value}
          onChange={onChange}
        />
      );
  }
  return <></>;
};

function formatJSONString(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {}
  return value;
}

const JSONEditor: FC<{
  displayName: string;
  schema: JSONSchema7;
  value: string;
  onChange: (value: string) => void;
}> = ({ displayName, schema, value, onChange }) => {
  const codeBgColor = useToken("colors", "gray.50");

  const [stringValue, setStringValue] = useState(formatJSONString(value));
  const validation = validateParameter(schema, value);
  return (
    <>
      <Text alignSelf="center">
        {displayName}{" "}
        {validation && (
          <Tooltip label={validation.message} fontSize="md">
            <WarningIcon color="red.500" boxSize={5} />
          </Tooltip>
        )}
      </Text>
      <CodeEditor
        language="json"
        padding={15}
        value={stringValue}
        onChange={(e) => {
          onChange(e.target.value);
          setStringValue(e.target.value);
        }}
        onBlur={(e) => setStringValue(formatJSONString(stringValue))}
        style={{
          fontSize: 12,
          backgroundColor: codeBgColor,
          fontFamily:
            "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
          flex: 1,
        }}
      />
    </>
  );
};
