import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import React, { FC } from "react";
import {
  FunctionTestCase,
  ParameterDescriptor,
  SelectedFunction,
} from "../../src-shared/source-info";

interface Props {
  param: ParameterDescriptor;
  selectedTestCase: FunctionTestCase | undefined;
  onUpdateTestCase: (paramName: string, value: string) => void;

  selectedFunction: SelectedFunction;
  selectedTestCaseIndex: number;
}

export const ParameterValueEditor: FC<Props> = ({
  param,
  selectedTestCase,
  onUpdateTestCase,
  selectedFunction,
  selectedTestCaseIndex,
}) => {
  const { fileName, functionName } = selectedFunction;
  return (
    <div key={param.name} style={{ display: "flex" }}>
      <VSCodeTextArea
        style={{ flex: 1, width: "100%" }}
        value={selectedTestCase?.inputs[param.name] ?? ""}
        onChange={(e: any) => {
          onUpdateTestCase(param.name, e.target?.value);
        }}
      >
        <div style={{ display: "flex" }}>
          <code
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              gap: "1rem",
            }}
          >
            {param.name}
          </code>
          <span>({param.schema?.type ?? "??"})</span>
        </div>
      </VSCodeTextArea>
    </div>
  );
};
