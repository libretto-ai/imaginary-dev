import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import React, { FC, useCallback, useState } from "react";
import {
  FunctionTestCase,
  SelectedFunction,
  SerializableFunctionDeclaration,
} from "../../src-shared/source-info";
import { ParameterValueEditor } from "./ParameterValueEditor";
import { useExtensionState } from "./ExtensionState";

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
      <RunImaginaryFunctionButton selectedFunction={selectedFunction} />
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

const RunImaginaryFunctionButton: FC<{
  selectedFunction: SelectedFunction;
}> = ({ selectedFunction }) => {
  const [result, setResult] = useState("");
  const { rpcProvider } = useExtensionState();
  const { fileName, functionName } = selectedFunction;

  const onRun = async () => {
    try {
      const zooAnimal = (await rpcProvider?.rpc(
        "generateTestParametersForTypeScriptFunction",
        {
          fileName,
          functionName,
        }
      )) as string;
      setResult(JSON.stringify(zooAnimal));
    } catch (ex) {
      console.error(`Failure to run: ${ex}`, ex);
    }
  };

  return (
    <>
      <div>{result}</div>
      <VSCodeButton onClick={onRun}>Run Imaginary Function</VSCodeButton>
    </>
  );
};
