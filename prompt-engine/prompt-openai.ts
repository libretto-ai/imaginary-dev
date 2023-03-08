import { ServiceParameters } from "@imaginary-dev/util";
import { STATUS_CODES } from "http";
import { Configuration, CreateCompletionRequest, OpenAIApi } from "openai";
import { Prompt, replaceVariablesInPrompt, TrimType } from "./prompt";
import { wrapWithRetry } from "./util";

// TODO: these should be configurable per-prompt
const DEFAULT_MODEL = process.env.PROMPTJS_MODEL ?? "text-davinci-003";
const DEFAULT_MAX_TOKENS = process.env.PROMPTJS_MAXTOKENS
  ? parseInt(process.env.PROMPTJS_MAXTOKENS, 10)
  : 3000;
const DEFAULT_TEMPERATURE = process.env.PROMPTJS_TEMPERATURE
  ? parseInt(process.env.PROMPTJS_TEMPERATURE, 10)
  : 0;
const runPrompt = async (
  prompt: Prompt,
  parameters: Record<string, string>,
  serviceParameters: ServiceParameters
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

  response.data.choices = response.data.choices.map((choice) => {
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
      logprobs: choice.logprobs,
      finish_reason: choice.finish_reason,
      index: choice.index,
      text: resultText,
    };
  });

  return response.data.choices[0];
};
const trim = (str: string, trimType: TrimType): string => {
  switch (trimType) {
    case "start":
      return str.trimStart();
    case "end":
      return str.trimEnd();
    case "both":
      return str.trim();
  }
  return str;
};
function getHttpErrorMessage(statusCode: number) {
  // Specialized error messages
  if (statusCode === 401) {
    return `Unauthorized: Invalid or missing OpenAI key`;
  }
  if (statusCode === 429) {
    return `${STATUS_CODES[statusCode]}: May be rate limited. Please try again later.`;
  }
  const retry = statusCode > 500;
  return retry
    ? `${STATUS_CODES[statusCode]}: Please try again.`
    : STATUS_CODES[statusCode]!;
}
class PromptError extends Error {
  status: number;
  error: Error;
  constructor(message: string, error: any) {
    super();
    this.message = message;
    this.status = error.status;
    this.error = error;
  }
}
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
