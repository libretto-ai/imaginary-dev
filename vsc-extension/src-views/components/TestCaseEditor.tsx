import React, { FC } from "react";
import {
  FunctionTestCase,
  SelectedFunction,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import { ParameterValueEditor } from "./ParameterValueEditor";

interface Props {
  selectedFunctionInfo: SerializableFunctionDeclaration | undefined;
  selectedTestCase: FunctionTestCase;
  onUpdateTestCase: (
    sourceFileName: string,
    functionName: string,
    paramName: string,
    testCaseIndex: number,
    value: string
  ) => void;
  selectedFunction: SelectedFunction;
  selectedTestCaseIndex: number;
}

export const TestCaseEditor: FC<Props> = ({
  selectedFunctionInfo,
  selectedTestCase,
  onUpdateTestCase,
  selectedFunction,
  selectedTestCaseIndex,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {selectedFunctionInfo?.parameters.map((param) => (
        <ParameterValueEditor
          key={param.name}
          param={param}
          selectedTestCase={selectedTestCase}
          onUpdateTestCase={onUpdateTestCase}
          selectedFunction={selectedFunction}
          selectedTestCaseIndex={selectedTestCaseIndex}
        />
      ))}
      <TemperatureEditor />
    </div>
  );
};

const TemperatureEditor: FC = () => {
  return (
    <div>
      <p>Temperature</p>
      <p>(temperature editor here)</p>
    </div>
  );
};
