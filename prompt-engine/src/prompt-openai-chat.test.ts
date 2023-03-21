import { ServiceParameters } from "@imaginary-dev/util";
import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import { Prompt } from "./prompt";
import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  runPrompt,
} from "./prompt-openai-chat";
import { PromptError } from "./prompt-openai-helpers";

jest.mock("openai");

describe("runPrompt", () => {
  const prompt: Prompt = {
    text: "What is your name?",
    trimPromptWhitespace: "both",
  };
  const parameters = { name: "John" };
  const serviceParameters: ServiceParameters = {
    openai: {
      max_tokens: 100,
      temperature: 0.8,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("throws an error when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const openaiApi = new OpenAIApi(
      new Configuration({ apiKey: "test-api-key" })
    );

    await expect(
      runPrompt(prompt, parameters, serviceParameters, openaiApi)
    ).rejects.toThrowError("Missing OPENAI_API_KEY environment variable.");
  });

  it("sends the expected request to OpenAI API", async () => {
    const openaiApi = new OpenAIApi(
      new Configuration({ apiKey: "test-api-key" })
    );

    const expectedRequest: CreateChatCompletionRequest = {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: expect.stringContaining(
            "You are a helpful artificial intelligence"
          ),
        },
        {
          role: "user",
          content: prompt.text,
        },
      ],
      temperature: serviceParameters.openai?.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: serviceParameters.openai?.max_tokens ?? DEFAULT_MAX_TOKENS,
      ...serviceParameters.openai,
    };

    const response = {
      data: {
        choices: [
          {
            message: { content: "My name is John.", finish_reason: "complete" },
          },
        ],
      },
    };

    jest
      .spyOn(openaiApi, "createChatCompletion")
      .mockResolvedValueOnce(response as any);

    await runPrompt(prompt, parameters, serviceParameters, openaiApi);

    expect(openaiApi.createChatCompletion).toHaveBeenCalledWith(
      expectedRequest
    );
  });

  it("throws a PromptError if the OpenAI API request fails", async () => {
    const openaiApi = new OpenAIApi(
      new Configuration({ apiKey: "test-api-key" })
    );

    const response = {
      response: {
        status: 500,
      },
      toJSON: jest.fn(() => ({ status: 500 })),
    };

    jest
      .spyOn(openaiApi, "createChatCompletion")
      .mockRejectedValueOnce(response as any);

    await expect(
      runPrompt(prompt, parameters, serviceParameters, openaiApi)
    ).rejects.toThrowError(PromptError);
  });
});
