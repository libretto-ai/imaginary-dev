"use client";
import {
  activeResultState,
  imaginaryFunctionDefinitionsState,
  isBusyState,
  runTestCase,
} from "@/state/scenarios";
import { TestCase, TestResult } from "@/types";
import {
  Alert,
  Box,
  Divider,
  Flex,
  Grid,
  Spinner,
  TabPanel,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { JSONSchema7 } from "json-schema";
import { FC } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { ParamEditor } from "./ParamEditor";

export const SampleEditor: FC<{
  testCase: TestCase;
  result?: TestResult;
  parameters: (JSONSchema7 & { name?: string })[];
  orientation?: "horizontal" | "vertical";
  onChange: (newTestCase: TestCase, testCaseId: string) => void;
}> = ({ result, testCase, parameters, onChange, orientation }) => {
  const [activeResult, updateActiveResult] = useRecoilState(activeResultState);
  const definitionsState = useRecoilValue(imaginaryFunctionDefinitionsState);
  const [isBusy, setIsBusy] = useRecoilState(isBusyState);

  return (
    <TabPanel
      display="flex"
      gap={2}
      flex={1}
      alignItems="stretch"
      flexDirection={{ base: "column", md: "row" }}
      p={0}
    >
      <Flex flex={1} alignItems="flex-start">
        <Box width="100%">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runTestCase(
                updateActiveResult,
                testCase.parameterValues,
                setIsBusy,
                definitionsState,
                false
              );
            }}
          >
            <Grid templateColumns="1fr 3fr" gap="2" p={2} width="100%">
              {parameters.map((parameter) =>
                typeof parameter.title === "string" ? (
                  <ParamEditor
                    key={parameter.title}
                    schema={parameter}
                    value={testCase.parameterValues[parameter.title]}
                    onSubmit={() =>
                      runTestCase(
                        updateActiveResult,
                        testCase.parameterValues,
                        setIsBusy,
                        definitionsState,
                        false
                      )
                    }
                    onChange={(newValue) => {
                      const newResult: TestCase = {
                        ...testCase,
                        parameterValues: {
                          ...testCase.parameterValues,
                          [parameter.title as string]: newValue,
                        },
                      };
                      onChange(newResult, testCase.id);
                    }}
                  />
                ) : null
              )}
            </Grid>
          </form>
        </Box>
      </Flex>
      <Divider orientation={orientation} width="2" />
      <Flex direction="column" flex={1}>
        <Text>Response:</Text>
        {isBusy && (
          <Box textAlign="center" paddingTop="25">
            <Spinner
              thickness="4px"
              speed="0.65s"
              emptyColor="gray.200"
              color="blue.500"
              size="xl"
            />
          </Box>
        )}
        {!isBusy && result?.lastResult?.type === "error" && (
          <Alert>{result.lastResult?.error}</Alert>
        )}
        {!isBusy &&
          (result?.lastResult?.type === "response" ||
            typeof result?.lastResult === "undefined") && (
            <Textarea
              fontFamily="mono"
              flex={1}
              rows={10}
              value={
                !result?.lastResult
                  ? ""
                  : JSON.stringify(result.lastResult?.response, null, 2)
              }
              onChange={(e) => {
                /* don't use readOnly, because that makes text unselectable in Firefox*/
              }}
            />
          )}
      </Flex>
    </TabPanel>
  );
};
