import { ServiceParameters } from "@imaginary-dev/util";
import { Configuration, CreateCompletionRequest, OpenAIApi } from "openai";
import { Prompt, replaceVariablesInPrompt } from "./prompt";
import {
  getHttpErrorMessage,
  PromptError,
  trim,
} from "./prompt-openai-helpers";
import { wrapWithRetry } from "./util";

// TODO: these should be configurable per-prompt
const DEFAULT_MODEL = process.env.PROMPTJS_MODEL ?? "text-davinci-003";
const DEFAULT_MAX_TOKENS = process.env.PROMPTJS_MAXTOKENS
  ? parseInt(process.env.PROMPTJS_MAXTOKENS, 10)
  : 3000;
const DEFAULT_TEMPERATURE = process.env.PROMPTJS_TEMPERATURE
  ? parseInt(process.env.PROMPTJS_TEMPERATURE, 10)
  : 0;
const runPrompt: (
  prompt: Prompt,
  parameters: Record<string, string>,
  serviceParameters: ServiceParameters
) => Promise<{ text: string; finish_reason?: string }> = async (
  prompt,
  parameters,
  serviceParameters
) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Missing OPENAI_API_KEY environment variable. See https://www.imaginary.dev/docs/installing-with-babel#adding-your-open-ai-api-key for details."
    );
  }
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  if (process.env.OPENAI_API_KEY) {
    configuration["headers"] = {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    };
  }

  const promptParts = replaceVariablesInPrompt(
    trim(prompt.text, prompt.trimPromptWhitespace ?? "end"),
    parameters
  );

  const time = new Date();

  const openai = new OpenAIApi(configuration);
  const completionRequest: CreateCompletionRequest = {
    model: serviceParameters?.openai?.model ?? DEFAULT_MODEL,
    prompt: promptParts.prompt,
    suffix: promptParts.suffix,
    max_tokens: serviceParameters?.openai?.max_tokens ?? DEFAULT_MAX_TOKENS,
    temperature: serviceParameters?.openai?.temperature ?? DEFAULT_TEMPERATURE,
    ...serviceParameters.openai,
  };
  if (process.env.PROMPTJS_LOGGING_ENABLED) {
    console.log("requesting prompt: ", completionRequest.prompt);
    console.log("params: ", serviceParameters);
    console.log("suffix: ", completionRequest.suffix);
  }

  let response: Awaited<ReturnType<typeof openai.createCompletion>>;
  try {
    response = await openai.createCompletion(completionRequest);
  } catch (e: any) {
    const statusCode: number = e.response?.status ?? 400;
    const message = getHttpErrorMessage(statusCode);
    throw new PromptError(message, e.toJSON());
  }

  const choices = response.data.choices.map((choice) => {
    // make sure to trim *before* validating
    let resultText: string | undefined = trim(
      choice.text ?? "",
      prompt.trimCompletionWhitespace ?? "both"
    );

    // validate if there's a regex for doing so.
    if (
      resultText &&
      prompt.validateRegex &&
      !new RegExp(prompt.validateRegex, "u").test(resultText)
    ) {
      resultText = undefined;
    }

    return {
      finish_reason: choice.finish_reason,
      text: resultText ?? "",
    };
  });

  return choices[0];
};

export const runPromptWithRetry = wrapWithRetry(runPrompt, {
  minTimeout: 300,
  retries: 3,
  shouldRetry(e, attempt) {
    if (e instanceof PromptError && (e.status >= 500 || e.status === 429)) {
      if (process.env.PROMPTJS_LOGGING_ENABLED) {
        console.warn(`Error from OpenAI: ${e}, retrying (attempt ${attempt})`);
      }
      return true;
    }
    return false;
  },
});
