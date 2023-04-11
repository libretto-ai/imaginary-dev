import {
  VSCodeButton,
  VSCodeDataGridCell,
  VSCodeTextArea,
} from "@vscode/webview-ui-toolkit/react";
import React, {
  FC,
  FocusEventHandler,
  PropsWithChildren,
  useState,
} from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  findMatchingFunction,
  FunctionTestCase,
} from "../../src-shared/source-info";
import { updateSourcefileTestCase } from "../../src-shared/testcases";
import {
  debugState,
  selectedFunctionState,
  selectedTestCaseIndexState,
  selectedTestCaseState,
  sourcesState,
  testCasesState,
} from "../shared/state";

// TestCasesList component
function TestCasesList({
  testCases,
  selectedIndex,
  onSelect,
}: {
  testCases: FunctionTestCase[];
  selectedIndex: number | null;
  onSelect: (selectedIndex: number) => void;
}) {
  return (
    <div className="input-scenarios-list" style={{ minWidth: "120px" }}>
      {testCases.map((testCase, index) => (
        <div
          key={index}
          style={{
            margin: 10,
            fontWeight: "bold",
            fontSize: "15px",
            cursor: "pointer",
            backgroundColor:
              index === selectedIndex
                ? "var(--list-active-selection-background)"
                : "",
            border:
              index === selectedIndex
                ? "solid calc(var(--border-width) * 1px) var(--focus-border)"
                : "1px solid gray",
            padding: "5px",
            borderRadius: "5px",
          }}
          onClick={() => onSelect(index)}
        >
          {testCase.name}
        </div>
      ))}
    </div>
  );
}

export function OutputPanel() {
  const sources = useRecoilValue(sourcesState);
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const selectedFunction = useRecoilValue(selectedFunctionState);
  const selectedTestCaseIndexes = useRecoilValue(selectedTestCaseState);
  const [testIndex, setTestIndex] = useRecoilState(
    selectedTestCaseIndexState(selectedFunction)
  );

  const fn = findMatchingFunction(sources, selectedFunction);
  const [debug, setDebug] = useRecoilState(debugState);

  const onUpdateTestCase = (paramName: string, value: string) => {
    if (!selectedFunction) {
      return;
    }

    const { fileName, functionName } = selectedFunction;

    setTestCases((prevFileTestCases) => {
      return updateSourcefileTestCase(
        prevFileTestCases,
        fileName,
        functionName,
        testIndex,
        paramName,
        value
      );
    });
  };

  const testCasesForSelectedFunction = Object.values(testCases)
    .flatMap((cases) => cases.functionTestCases)
    .filter((cases) => cases.functionName === selectedFunction?.functionName)
    .flatMap((cases) => cases.testCases);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <TestCasesList
          testCases={testCasesForSelectedFunction}
          selectedIndex={testIndex}
          onSelect={setTestIndex}
        />{" "}
        <div
          style={{
            display: "grid",
            alignContent: "start",
            gridTemplateColumns: "auto 1fr 1fr 1fr",
            margin: "12px",
            minWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              gridColumnStart: 1,
              gridColumnEnd: 3,
              fontSize: 16,
              fontWeight: "bolder",
            }}
          >
            Inputs
          </div>
          <div style={{ fontSize: 16, fontWeight: "bolder" }}>
            Previous Outputs
          </div>
          <div style={{ fontSize: 16, fontWeight: "bolder" }}>Output</div>
          {!!testCasesForSelectedFunction[testIndex] &&
            Object.entries(testCasesForSelectedFunction[testIndex].inputs).map(
              ([paramName, paramValue], index) => (
                <>
                  <div style={{ margin: "6px" }}>{paramName}</div>
                  <div style={{ margin: "6px" }}>
                    <ParamEditor
                      value={paramValue}
                      onChange={(newValue) =>
                        onUpdateTestCase(paramName, newValue)
                      }
                    />
                    {/* {JSON.stringify(paramValue)} */}
                  </div>
                  {index === 0 && (
                    <>
                      <div
                        style={{
                          margin: "6px",
                          gridRow:
                            "2 / " +
                            testCasesForSelectedFunction[testIndex].inputs
                              .length +
                            2,
                          gridColumn: "3 / 4",
                        }}
                      >
                        {/* {testCasesForSelectedFunction[testIndex].output.current} */}
                        PREVIOUS OUTPUT (to be done)
                      </div>
                      <div
                        style={{
                          margin: "6px",
                          gridRow:
                            "2 / " +
                            testCasesForSelectedFunction[testIndex].inputs
                              .length +
                            2,
                          gridColumn: "4 / 5",
                        }}
                      >
                        {/* {testCasesForSelectedFunction[testIndex].output.current} */}
                        OUTPUT (to be done)
                      </div>
                    </>
                  )}
                </>
              )
            )}
        </div>
      </div>
      <div>
        <VSCodeButton
          appearance="icon"
          onClick={() => setDebug((prevDebug) => !prevDebug)}
        >
          <span>🐛</span>
        </VSCodeButton>
        {debug && (
          <div>
            <p>Functions</p>
            <pre>{JSON.stringify(sources, null, 4)}</pre>
            <p>SelectedFunction</p>
            <pre>{JSON.stringify(selectedFunction, null, 4)}</pre>
            <p>Inputs/Outputs</p>
            <pre>{JSON.stringify(testCases, null, 4)}</pre>
            <p>TestCaseIndexes</p>
            <pre>{JSON.stringify(selectedTestCaseIndexes, null, 4)}</pre>
          </div>
        )}
      </div>
    </>
  );
}

const ParamEditor: FC<{ value: string; onChange: (arg0: string) => void }> = ({
  value,
  onChange,
}) => {
  // const textAreaRef = useRef<typeof VSCodeTextArea>();
  // useEffect(() => {
  //   if (textAreaRef.current) {
  //     // We need to reset the height momentarily to get the correct scrollHeight for the textarea
  //     textAreaRef.current.style.height = "0px";
  //     const scrollHeight = textAreaRef.current.scrollHeight;

  //     // We then set the height directly, outside of the render loop
  //     // Trying to set this with state or a ref will product an incorrect value.
  //     textAreaRef.current.style.height = scrollHeight + "px";
  //   }
  // }, [textAreaRef, value]);
  return (
    <VSCodeTextArea
      // ref={textAreaRef}
      style={{ flex: 1, width: "100%", height: "auto" }}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    />
  );
};

const VSCodeDataGridEditorCell: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [value, setValue] = useState<string>(children as string);

  const onFocus: FocusEventHandler<HTMLDivElement> = (
    e: React.FocusEvent<HTMLDivElement, Element>
  ) => {
    console.log("onFocus");
    setIsFocused(true);
  };

  const onBlur: FocusEventHandler<HTMLDivElement> = (
    e: React.FocusEvent<HTMLDivElement, Element>
  ) => {
    console.log("onBlur");
    setIsFocused(false);
  };

  return (
    <VSCodeDataGridCell gridColumn="2" onFocus={onFocus} onBlur={onBlur}>
      {isFocused ? (
        <VSCodeTextArea
          style={{ flex: 1, width: "100%" }}
          value={children as string}
          onChange={(e: any) => {
            console.log(e);
            setValue(e.target.value);
          }}
        />
      ) : (
        children
      )}
    </VSCodeDataGridCell>
  );
};
