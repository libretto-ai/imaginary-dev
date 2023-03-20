import { ServiceParameters } from "@imaginary-dev/util";
import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import { Prompt, replaceVariablesInPrompt, TrimType } from "./prompt";
import {
  getHttpErrorMessage,
  PromptError,
  trim,
} from "./prompt-openai-helpers";
import { wrapWithRetry } from "./util";

// TODO: these should be configurable per-prompt
const DEFAULT_MODEL = process.env.PROMPTJS_MODEL ?? "gpt-3.5-turbo";
const DEFAULT_MAX_TOKENS = process.env.PROMPTJS_MAXTOKENS
  ? parseInt(process.env.PROMPTJS_MAXTOKENS, 10)
  : 7000;
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
  const model = serviceParameters?.openai?.model ?? DEFAULT_MODEL;
  const completionRequest: CreateChatCompletionRequest = {
    model,
    messages: [
      {
        role: "system",
        content: `You are a helpful artificial intelligence that runs theoretical TypeScript functions by guessing what those functions return. You sometimes include your reasoning for a particular answer at the start of your response if it helps you think the problem through, but you always eventually output the answer in JSON. To make sure it's possible to parse, put the JSON result inside Markdown style back ticks, like:

\`\`\`json
{
  "firstName": "Jane",
  "lastName": "Smith",
  }
\`\`\``,
      },
      { role: "user", content: promptParts.prompt },
    ],
    temperature: serviceParameters?.openai?.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens:
      serviceParameters?.openai?.max_tokens ?? getMaxTokensForModel(model),
    ...serviceParameters.openai,
  };
  if (process.env.PROMPTJS_LOGGING_ENABLED) {
    console.log("requesting messages: ", completionRequest.messages);
    console.log("params: ", serviceParameters);
  }

  let response: Awaited<ReturnType<typeof openai.createChatCompletion>>;
  try {
    response = await openai.createChatCompletion(completionRequest);
  } catch (e: any) {
    if (process.env.PROMPTJS_LOGGING_ENABLED) {
      console.error("prompt error: ", e);
    }
    const statusCode: number = e.response?.status ?? 400;
    const message = getHttpErrorMessage(statusCode);
    throw new PromptError(message, e.toJSON());
  }

  const choices = response.data.choices.map((choice) => {
    let resultText: string | undefined = trim(
      choice.message?.content ?? "",
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
      text: choice.message?.content ?? "",
    };
  });

  return choices[0];
};

function getMaxTokensForModel(model: string) {
  // GPT-3.5 can do about 4k total.
  if (model.includes("gpt-3.5")) return 3000;
  // GPT-4 can do about 8k total.
  return 7000;
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
