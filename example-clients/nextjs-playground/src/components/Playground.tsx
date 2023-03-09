"use client";

import { useRestoreFromUrl } from "@/util/persistState";
import { Box, Card, Code, Flex, Text, useToast } from "@chakra-ui/react";
import { useEffect } from "react";
import { ScenarioCodeEditor } from "./ScenarioCodeEditor";
import { ScenarioParameterEditor } from "./ScenarioParameterEditor";
interface Props {}

export const Playground = () => {
  const { stateError } = useRestoreFromUrl();
  const toast = useToast();
  useEffect(() => {
    if (stateError) {
      toast({
        title: "Unable to restore prompt",
        description: (
          <Text>
            {`Oh no! It looks like the URL you entered may have been corrupted or truncated.
            Please check to make sure that you've entered the full URL correctly.
            The error is: `}
            <Code>{`${stateError}`}</Code>
          </Text>
        ),
        status: "error",
        duration: 10_000,
        isClosable: true,
      });
    }
  }, [stateError, toast]);
  return (
    <Box bgColor="gray.50" h="100vh" w="100vw" padding={{ base: 0, md: 8 }}>
      <Card height="100%">
        <PlaygroundScenarioTabs />
      </Card>
    </Box>
  );
};

function PlaygroundScenarioTabs() {
  return (
    <Flex flex={1} direction="column" gap={4}>
      <ScenarioCodeEditor />
      <ScenarioParameterEditor />
    </Flex>
  );
}
export default Playground;
