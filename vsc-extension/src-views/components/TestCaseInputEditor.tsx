import React, { CSSProperties, FC } from "react";
import {
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import { ParamEditor } from "./ParamEditor";

interface Props {
  functionTestCase: FunctionTestCase;
  fn: SerializableFunctionDeclaration;
  onUpdateTestCase: (paramName: string, value: string) => void;
  autoFocusFirst?: boolean;
  style?: CSSProperties;
}

export const TestCaseInputEditor: FC<Props> = ({
  functionTestCase,
  fn,
  onUpdateTestCase,
  autoFocusFirst,
  style,
}) => {
  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {functionTestCase &&
        fn.parameters.map((param, index) => (
          <div
            key={param.name}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <ParamEditor
              parameter={param}
              autoFocus={index === 0 ? autoFocusFirst : undefined}
              value={functionTestCase.inputs[param.name]}
              onChange={(newValue) => onUpdateTestCase(param.name, newValue)}
            />
          </div>
        ))}
    </div>
  );
};
