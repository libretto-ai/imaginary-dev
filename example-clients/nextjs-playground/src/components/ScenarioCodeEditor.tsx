"use client";
import {
  activeResultState,
  activeTestCaseState,
  imaginaryFunctionDefinitionsState,
  isBusyState,
  runTestCase,
  testCasesState,
  validateParameter,
  workingScenarioState,
} from "@/state/scenarios";
import { getImaginaryFunctionDefinitions } from "@/util/babel";
import { makeTSDocParser } from "@/util/comments";
import { ChevronDownIcon } from "@chakra-ui/icons";
import {
  Alert,
  AlertIcon,
  AlertTitle,
  Button,
  Flex,
  Hide,
  Icon,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Show,
  Tag,
  TagLabel,
  TagRightIcon,
  Text,
  Tooltip,
  useDisclosure,
  useToken,
} from "@chakra-ui/react";
import {
  ImaginaryFunctionDefinition,
  isImaginaryCommentBlock,
} from "@imaginary-dev/util";
import { JSONSchema7 } from "json-schema";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import {
  ComponentProps,
  FC,
  MouseEvent,
  PropsWithChildren,
  useMemo,
} from "react";
import { FiChevronRight, FiPlay, FiShare2 } from "react-icons/fi";
import { useRecoilState, useRecoilValue } from "recoil";
import { useDebounce } from "use-debounce";
import { presetScenarios } from "../util/presetScenarios";
import { ShareDialog } from "./ShareDialog";

export const CodeEditor = dynamic(
  () => import("@uiw/react-textarea-code-editor").then((mod) => mod.default),
  { ssr: false }
);

export function ScenarioCodeEditor() {
  const codeBgColor = useToken("colors", "gray.50");

  // TODO: this isn't really the active scenario
  const [activeScenario, setActiveScenario] =
    useRecoilState(workingScenarioState);
  const [activeResult, updateActiveResult] = useRecoilState(activeResultState);
  const [activeTestCase, updateActiveTestCase] =
    useRecoilState(activeTestCaseState);
  const [testCases, setTestCases] = useRecoilState(testCasesState);
  const imaginaryFunctionDefinitions = useRecoilValue(
    imaginaryFunctionDefinitionsState
  );
  const [isBusy, setIsBusy] = useRecoilState(isBusyState);
  const { definitions, error, parsedCode } =
    useImaginaryFunctionDefinitionsFromCode(activeScenario.code);

  const loadPreset = (scenarioId: string) => {
    const preset = presetScenarios.find(
      ({ scenario }) => scenario.id === scenarioId
    );
    if (preset) {
      setActiveScenario(preset.scenario);
      setTestCases(preset.testCases);
    }
  };

  const onRunButtonClick = async (event: MouseEvent) => {
    runTestCase(
      updateActiveResult,
      activeTestCase.parameterValues,
      setIsBusy,
      imaginaryFunctionDefinitions,
      event.shiftKey
    );
  };
  const { onClose, onOpen, isOpen } = useDisclosure();

  const onShareButtonClick = () => {
    onOpen();
  };

  const isRunDisabled = useMemo(() => {
    if (definitions?.length !== 1) return true;

    const paramNameToType: Record<string, JSONSchema7 | undefined> = {};
    definitions?.[0].parameterTypes.forEach(
      ({ name, type }) => (paramNameToType[name] = type)
    );

    return Object.entries(activeTestCase.parameterValues).every(
      ([name, value]) => {
        const type: JSONSchema7 | undefined = paramNameToType[name];
        return (
          typeof type !== "undefined" && validateParameter(type, value) !== null
        );
      }
    );
  }, [activeTestCase.parameterValues, definitions]);

  return (
    <Flex direction="column" flex={1} padding="3">
      <ShareDialog onClose={onClose} isOpen={isOpen} />
      <Flex
        alignItems={{ base: "center", md: "baseline" }}
        style={{ marginBottom: 10 }}
        gap={3}
      >
        <Text fontSize={{ base: "xs", md: "x-large" }} flex={1}>
          Imaginary Programming Playground
        </Text>
        <Tag borderRadius="full" backgroundColor="#3662E2" color="white" p={2}>
          <TagLabel>
            <Link as={NextLink} href="https://imaginary.dev" target="_blank">
              <Hide below="md">Add Imaginary Programming to your code</Hide>
              <Show below="md">Add to your project</Show>
            </Link>
          </TagLabel>
          <Hide below="md">
            <TagRightIcon as={FiChevronRight} />
          </Hide>
        </Tag>
        <Menu>
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
            <Text overflow="hidden" textOverflow="ellipsis">
              <Hide below="md">Load preset imaginary function...</Hide>
              <Show below="md">Presets</Show>
            </Text>
          </MenuButton>
          <MenuList>
            {presetScenarios.map(({ scenario }) => (
              <MenuItem
                onClick={(e) => loadPreset(scenario.id)}
                key={scenario.id}
              >
                {scenario.name}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
        <Button onClick={onShareButtonClick} rightIcon={<Icon as={FiShare2} />}>
          <Hide below="md">Share</Hide>
        </Button>
        <Tooltip
          openDelay={isRunDisabled ? 0 : 1000}
          label={
            isRunDisabled ? (
              <Text>Enter a valid imaginary prompt</Text>
            ) : (
              <Text>Hold down shift to force a fresh response</Text>
            )
          }
        >
          <Button
            isDisabled={isRunDisabled}
            isLoading={isBusy}
            onClick={onRunButtonClick}
            rightIcon={<Icon as={FiPlay} />}
            colorScheme="blue"
          >
            Run
          </Button>
        </Tooltip>
      </Flex>
      <CodeEditor
        language="ts"
        padding={15}
        placeholder={codePlaceholder}
        value={activeScenario.code}
        onChange={(e) =>
          setActiveScenario((scenario) => ({
            ...scenario,
            code: e.target.value,
          }))
        }
        style={{
          fontSize: 12,
          backgroundColor: codeBgColor,
          fontFamily:
            "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
          flex: 1,
        }}
      />
      <Flex py={1}>
        {parsedCode && <SyntaxErrors definitions={definitions} error={error} />}
      </Flex>
    </Flex>
  );
}
const codePlaceholder = `/**
 * Enter your code here
 * @imaginary
 */
declare function newFunction(param: string): Promise<string>`;

/// TODO: Move error detection to the babel / typescript transformer instead
const SyntaxErrors: FC<{
  definitions: ImaginaryFunctionDefinition[] | null;
  error?: Error;
}> = ({ definitions, error }) => {
  if (error) {
    return <SimpleAlert>{`${error}`}</SimpleAlert>;
  }
  if (!definitions?.length) {
    return <SimpleAlert>No declarations found</SimpleAlert>;
  }

  const commentBlocks = definitions.filter(
    (definition) => definition.funcComment
  );

  if (!commentBlocks.length) {
    return (
      <SimpleAlert>{`Function declarations must have TSDoc comments`}</SimpleAlert>
    );
  }

  const parser = makeTSDocParser();
  const imaginaryDeclarations = definitions.filter((definition) => {
    const parsedComment = parser.parseString(definition.funcComment);
    return isImaginaryCommentBlock(parsedComment);
  });
  if (!imaginaryDeclarations.length) {
    return (
      <SimpleAlert>{`Declarations must have an @imaginary tag in the TSDoc comment`}</SimpleAlert>
    );
  }
  if (imaginaryDeclarations.length > 1) {
    return (
      <SimpleAlert>{`Only one imaginary declaration is allowed (found ${definitions.length}).`}</SimpleAlert>
    );
  }

  if (!imaginaryDeclarations[0].parameterTypes.length) {
    return (
      <SimpleAlert status="warning">{`Function should take at least one parameter`}</SimpleAlert>
    );
  }
  if (!imaginaryDeclarations[0].returnSchema) {
    return (
      <SimpleAlert status="warning">{`Function should declare a return type`}</SimpleAlert>
    );
  }

  const invalidParameters = imaginaryDeclarations.flatMap((declaration) =>
    declaration.parameterTypes.filter((parameter) => !parameter.type)
  );
  if (invalidParameters.length) {
    return (
      <SimpleAlert status="warning">{`Missing types for parameters: ${invalidParameters
        .map((p) => `"${p.name}" `)
        .join(", ")}`}</SimpleAlert>
    );
  }

  return null;
};

const SimpleAlert: FC<
  PropsWithChildren<{
    status?: ComponentProps<typeof Alert>["status"];
  }>
> = ({ status = "error", children }) => {
  return (
    <Alert status={status}>
      <AlertIcon />
      <AlertTitle>{children}</AlertTitle>
    </Alert>
  );
};

function useImaginaryFunctionDefinitionsFromCode(code: string) {
  const [scenarioCode] = useDebounce(code, 500);
  const definitions = useMemo(() => {
    try {
      const definitions = getImaginaryFunctionDefinitions(scenarioCode, true);
      return { definitions };
    } catch (ex) {
      return { definitions: [], error: ex as Error };
    }
  }, [scenarioCode]);

  return { parsedCode: scenarioCode, ...definitions };
}
