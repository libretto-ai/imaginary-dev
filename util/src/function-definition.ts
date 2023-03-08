import { JSONSchema7 } from "json-schema";
import objectHash from "object-hash";
import { CreateCompletionRequest } from "openai";
export interface ImaginaryFunctionDefinition {
  funcName: string;
  funcComment: string;
  parameterTypes: { name: string; type?: JSONSchema7 }[];
  returnSchema: JSONSchema7 | null;
  /** Set to false when parser allows imaginary functions in the response */
  isImaginary?: boolean;
  serviceParameters: ServiceParameters;
}

export interface ServiceParameters {
  openai?: Partial<Omit<CreateCompletionRequest, "prompt">>;
}

export const AI_SERVICES: (keyof ServiceParameters)[] = ["openai"];

/** Come up with a unique hash to represent an imaginary function definition, for use in tracking changes, etc */
export function hashFunctionDefinition(
  definition: ImaginaryFunctionDefinition
) {
  // TODO: normalize things like null/undefined, missing objects, etc
  return objectHash(definition);
}
