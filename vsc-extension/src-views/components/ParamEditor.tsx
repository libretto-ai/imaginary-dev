import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import React, { FC } from "react";

export const ParamEditor: FC<{
  value: string;
  onChange: (arg0: string) => void;
}> = ({ value, onChange }) => {
  const valueToDisplay =
    typeof value === "string" ? value : JSON.stringify(value);

  return (
    <VSCodeTextArea
      style={{ flex: 1, width: "100%", height: "auto" }}
      value={valueToDisplay}
      onChange={(e: any) => onChange(e.target.value)}
    />
  );
};
