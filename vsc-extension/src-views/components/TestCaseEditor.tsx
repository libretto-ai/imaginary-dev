import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback } from "react";
import {
  FunctionTestCase,
  SelectedFunction,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import { useExtensionState } from "./ExtensionState";
import { ParameterValueEditor } from "./ParameterValueEditor";

interface Props {
  selectedFunctionInfo: SerializableFunctionDeclaration | undefined;
  selectedTestCase: FunctionTestCase | undefined;
  onUpdateTestCase: (paramName: string, value: string) => void;
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
      <RunButton
        selectedFunction={selectedFunction}
        testCaseIndex={selectedTestCaseIndex}
      />
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

const RunButton: FC<{
  selectedFunction: SelectedFunction;
  testCaseIndex: number;
}> = ({ selectedFunction, testCaseIndex }) => {
  const { rpcProvider } = useExtensionState();
  const { fileName, functionName } = selectedFunction;

  const onRun = useCallback(async () => {
    try {
      await rpcProvider?.rpc("runTestCase", {
        fileName,
        functionName,
        testCaseIndex,
      });
    } catch (ex) {
      console.error(`Failure to run: ${ex}`, ex);
    }
  }, [fileName, functionName, rpcProvider, testCaseIndex]);

  if (!rpcProvider) {
    return null;
  }
  return <VSCodeButton onClick={onRun}>Run</VSCodeButton>;
};
