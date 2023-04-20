import React, { FC } from "react";
import {
  FunctionTestCase,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import { ParamEditor } from "./ParamEditor";

interface Props {
  functionTestCase: FunctionTestCase;
  fn: SerializableFunctionDeclaration;
  onUpdateTestCase: (paramName: string, value: string) => void;
}

export const TestCaseInputEditor: FC<Props> = ({
  functionTestCase,
  fn,
  onUpdateTestCase,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {functionTestCase &&
        fn.parameters.map((param) => (
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
              value={functionTestCase.inputs[param.name]}
              onChange={(newValue) => onUpdateTestCase(param.name, newValue)}
            />
          </div>
        ))}
    </div>
  );
};
