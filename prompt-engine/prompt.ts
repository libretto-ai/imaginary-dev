export type TrimType = "start" | "end" | "both" | "none";

export type Prompt = {
  text: string;
  trimCompletionWhitespace?: TrimType;
  trimPromptWhitespace?: TrimType;
  validateRegex?: string;
};

const VARIABLE_REGEX = /\{\{\W*([a-zA-Z0-9_-]+)\W*\}\}/g;
const COMPLETION_VARIABLE_NAME = "completion";
const COMPLETION_REGEX = /\{\{\W*completion\W*\}\}/;

export function getVariablesFromPrompt(prompt: Prompt): string[] {
  // the Set constructor is to eliminate duplicates, and the map to result[1] is
  // to extract the capture group, which is the variable name.
  return [
    ...new Set(
      [...prompt.text.matchAll(VARIABLE_REGEX)].map((result) => result[1])
    ),
  ];
}

// todo: use a more intensive templating engine
export function replaceVariablesInPrompt(promptText: string, parameters) {
  const variableReplacedPrompt = promptText.replace(
    VARIABLE_REGEX,
    (match, captureGroup1) => {
      // skip over "{{completion}}"
      if (captureGroup1 === COMPLETION_VARIABLE_NAME) {
        return `{{${COMPLETION_VARIABLE_NAME}}}`;
      }
      // TODO: deal with optional parameters
      if (typeof parameters[captureGroup1] === "undefined") {
        throw new Error(
          `Prompt cannot be issued because the required argument ${captureGroup1} is missing.`
        );
      }
      return JSON.stringify(parameters[captureGroup1]);
    }
  );

  const promptParts = variableReplacedPrompt.split(COMPLETION_REGEX);

  if (promptParts.length === 1) {
    return { prompt: promptParts[0] };
  } else if (promptParts.length === 2) {
    return { prompt: promptParts[0], suffix: promptParts[1] };
  }
  throw new Error(
    "The prompt had more than one '{{completion}}' token. Only one completion token is allowed."
  );
}
