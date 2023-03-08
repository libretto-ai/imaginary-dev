"use client";
import {
  activeTestCaseIndexState,
  createTestCase,
  testCasesState,
  workingScenarioState,
} from "@/state/scenarios";
import { TestCase } from "@/types";
import { getJSONParameterSchemas, JSONSchemaOrUntyped } from "@/util/babel";
import {
  Icon,
  IconButton,
  TabList,
  TabPanels,
  Tabs,
  useBreakpointValue,
} from "@chakra-ui/react";
import { JSONSchema7 } from "json-schema";
import { useMemo } from "react";
import { MdAddTask } from "react-icons/md";
import { useRecoilState } from "recoil";
import { useDebounce } from "use-debounce";
import { RemovableTab } from "./RemovableTabProps";
import { SampleEditor } from "./SampleEditor";

export function ScenarioParameterEditor() {
  const [scenario] = useRecoilState(workingScenarioState);
  const [testCases, setTestCases] = useRecoilState(testCasesState);

  // Don't update the code on every keystroke, just debounce changes
  const { code } = scenario;
  const { parameters, error } = useParametersFromCode(code);
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useRecoilState(
    activeTestCaseIndexState
  );
  const updateTestCase = (newTestCase: TestCase, testCaseId: string) => {
    setTestCases((prevTestCases) =>
      prevTestCases.map((prevTestCase) =>
        prevTestCase.id === testCaseId ? newTestCase : prevTestCase
      )
    );
  };
  const addTestCase = () => {
    setTestCases((prevTestCases) => [
      ...prevTestCases,
      createTestCase("New test case"),
    ]);
    setActiveTestCaseIndex(testCases.length);
  };
  const removeTestCase = (testCase: TestCase) => {
    // if the last one is selected, reassign the active index so that it stays inside the
    // array length.
    if (activeTestCaseIndex >= testCases.length - 1)
      setActiveTestCaseIndex(testCases.length - 2);
    setTestCases((prevCases) =>
      prevCases.filter((oldTestCase) => testCase.id !== oldTestCase.id)
    );
  };
  const tabOrientation = useBreakpointValue({
    md: "vertical",
    base: "horizontal",
  } as const);
  return (
    <Tabs
      index={activeTestCaseIndex}
      onChange={setActiveTestCaseIndex}
      flex={1}
      orientation={tabOrientation}
    >
      <TabList maxWidth={{ md: 60 }} overflow="auto">
        {testCases.map((testCase) => (
          <RemovableTab
            key={testCase.id}
            minWidth={40}
            onRemove={() => removeTestCase(testCase)}
            isRemoveDisabled={testCases.length <= 1}
          >
            {testCase.name}
          </RemovableTab>
        ))}
        <IconButton
          variant="unstyled"
          aria-label="Add new test case"
          icon={<Icon as={MdAddTask} />}
          onClick={addTestCase}
        />
      </TabList>
      <TabPanels borderLeftWidth="revert" display="flex">
        {testCases.map((testCase) => (
          <SampleEditor
            key={testCase.id}
            testCase={testCase}
            orientation={tabOrientation}
            result={scenario.results[testCase.id]}
            parameters={parameters.filter(
              (param): param is JSONSchema7 & { name?: string } =>
                param !== null
            )}
            onChange={updateTestCase}
          />
        ))}
      </TabPanels>
    </Tabs>
  );
}
function useParametersFromCode(code: string) {
  const [scenarioCode] = useDebounce(code, 500);
  return useMemo(() => {
    const noParams: JSONSchemaOrUntyped[] = [];
    if (!scenarioCode) {
      return { parameters: noParams, error: null };
    }
    try {
      const parameters = getJSONParameterSchemas(scenarioCode);
      return { parameters, error: null };
    } catch (ex) {
      const noParams: JSONSchemaOrUntyped[] = [];
      return { parameters: noParams, error: ex as Error };
    }
  }, [scenarioCode]);
}
