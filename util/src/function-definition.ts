import { JSONSchema7 } from "json-schema";
import objectHash from "object-hash";
import {
  ConfigurationParameters,
  CreateChatCompletionRequest,
  CreateCompletionRequest,
} from "openai";
import { ValueOf } from "ts-essentials";
export interface ImaginaryFunctionDefinition {
  funcName: string;
  funcComment: string;
  parameterTypes: { name: string; type?: JSONSchema7 }[];
  returnSchema: JSONSchema7 | null;
  /** Set to false when parser allows imaginary functions in the response */
  isImaginary?: boolean;
  serviceParameters: ServiceParameters;
}

type OpenAIParameters = Partial<
  Omit<CreateCompletionRequest & CreateChatCompletionRequest, "prompt">
> & {
  apiConfig?: ConfigurationParameters;
};

export interface ServiceParameters {
  openai?: OpenAIParameters;
}

type SafeKeyOf<T> = T extends undefined ? never : keyof T;
type OpenaiServiceParameterKey = SafeKeyOf<OpenAIParameters>;

const safeServiceParameterKeys = [
  "temperature",
  "max_tokens",
] satisfies OpenaiServiceParameterKey[];
type SafeKeys = ValueOf<typeof safeServiceParameterKeys>;

/** Extract only the exact keys that we should be passing to OpenAI's api calls */
export function getSafeOpenAIServiceParameters(
  serviceParameters: ServiceParameters
): Pick<OpenAIParameters, SafeKeys> {
  const { max_tokens, temperature } = serviceParameters.openai ?? {};
  return {
    ...(max_tokens !== undefined ? { max_tokens } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
  };
}

export const AI_SERVICES: (keyof ServiceParameters)[] = ["openai"];

/** Come up with a unique hash to represent an imaginary function definition, for use in tracking changes, etc */
export function hashFunctionDefinition(
  definition: ImaginaryFunctionDefinition
) {
  // TODO: normalize things like null/undefined, missing objects, etc
  return objectHash(definition);
}
