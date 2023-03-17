import {
  ImaginaryFunctionDefinition,
  jsonSchemaToTypeScriptText,
  ServiceParameters,
} from "@imaginary-dev/util";
import Ajv from "ajv";
import { JSONSchema7 } from "json-schema";
import { v4 as uuidv4 } from "uuid";
import cleanGptResponse, {
  getWrappedValueType,
  isSchemaForNull,
} from "./clean-gpt-response";
import { getJSONSchemaType } from "./json-schema-util";
import { runPromptWithRetry } from "./prompt-openai";
import { beginReportEvent, finishReport, reportEventErrors } from "./reporting";

const ajv = new Ajv();

enum PromptPrefix {
  Object = "{",
  Array = "[",
  ObjectArray = "[{",
  WrappedString = '{"value":"',
  Raw = "",
  WrappedValue = '{"value":',
}

// TODO: parse the function declaration with typescript and tsdoc to get better error checking and
// more prompt flexibility
export async function callImaginaryFunction(
  funcComment: string,
  funcName: string,
  parameterTypes: {
    name: string;
    type?: JSONSchema7;
  }[],
  returnSchema: JSONSchema7,
  params: Record<string, any>,
  serviceParameters: ServiceParameters = {}
): Promise<any> {
  const now = new Date();
  const promptEventId = uuidv4();
  const promptDefinition: ImaginaryFunctionDefinition = {
    funcComment,
    funcName,
    parameterTypes,
    returnSchema,
    isImaginary: true,
    serviceParameters,
  };
  const beginEventPromise = beginReportEvent(
    promptEventId,
    promptDefinition,
    params
  );
  const paramNames = parameterTypes.map(({ name }) => name);

  // this may be too restrictive, but I'm starting out restrictive and moving in the direction of less
  // restrictive if it becomes a burden.
  if (!funcComment.trim().startsWith("/**")) {
    throw new Error(
      "The function comment must start with '/**' to be a proper @imaginary TSDoc comment"
    );
  }
  if (!funcComment.trim().endsWith("*/")) {
    throw new Error(
      "The function comment must end with '*/' to be a proper  @imaginary TSDoc comment"
    );
  }
  if (funcComment.trim().indexOf("*/") < funcComment.trim().length - 2) {
    throw new Error("The function comment cannot include non-comment text.");
  }

  const prefix = getPromptPrefix(returnSchema);
  const typehint = getPromptHint(returnSchema);
  const canBeNull =
    isSchemaForNull(returnSchema) || !getWrappedValueType(returnSchema);

  const primitiveInstructions = canBeNull
    ? ""
    : "Never return null or undefined.";

  const IMAGINARY_FUNCTION_PROMPT = `Consider the following TypeScript function prototype:
---
${funcComment}
declare function ${funcName}(${parameterTypes
    .map(
      ({ name, type }) =>
        `${name}: ${type ? jsonSchemaToTypeScriptText(type) : "any"}`
    )
    .join(", ")}) : ${jsonSchemaToTypeScriptText(returnSchema)}
---
Tell me what the function outputs for the following parameters.

${Object.entries(params)
  // Make sure extra parameters do not bleed through
  .filter(([paramName]) => paramNames.includes(paramName))
  .map(
    ([paramName, paramValue]) =>
      `  ${paramName}: {{${paramName}}}

`
  )
  .join("")}
${typehint ? `The JSON output should be in the form: ${typehint}` : ""}
${primitiveInstructions}

Return value as JSON: ${prefix}`;

  const completion = await runPromptWithRetry(
    { text: IMAGINARY_FUNCTION_PROMPT },
    params,
    serviceParameters
  );

  if (process.env.PROMPTJS_LOGGING_ENABLED) {
    console.log(`completion: \`${completion.text}\``);
  }
  let completionObject: string | null;
  try {
    completionObject = cleanGptResponse(
      `${prefix}${completion.text ?? ""}`,
      returnSchema
    );
  } catch (e) {
    // TODO: should we throw the error?
    console.error(
      `Error parsing the result from OpenAI as a JSON object: \`${prefix}${completion.text}\``,
      e
    );
    return null;
  }

  // TODO: pre-compile schemas?
  const validate = ajv.compile(returnSchema);
  const valid = validate(completionObject);

  const errorMessages = validate.errors?.map(
    (error) =>
      `Validation error:${error.message ?? " "} at ${error.instancePath}`
  );

  // TODO: we shouldn't hold up for begin/finish report events to complete
  const finishEventPromise = finishReport(
    promptEventId,
    promptDefinition,
    params,
    now,
    completionObject,
    errorMessages
  );

  await reportEventErrors(beginEventPromise, finishEventPromise);

  if (!valid) {
    console.error(`Error validating the return value.`, validate.errors);
    return null;
  }

  return completionObject;
}

function getPromptPrefix(type: JSONSchema7): string {
  const jsonSchemaType = getJSONSchemaType(type);
  switch (jsonSchemaType) {
    case "object":
      return PromptPrefix.Object;
    case "array":
      if (
        typeof type.items === "object" &&
        !Array.isArray(type.items) &&
        type.items.type === "object"
      ) {
        return PromptPrefix.ObjectArray;
      }
      return PromptPrefix.Array;
    case "string":
      return PromptPrefix.WrappedString;
    case "number":
    case "integer":
    case "boolean":
    case "null":
      return PromptPrefix.WrappedValue;
  }
}

function getPromptHint(type: JSONSchema7): string {
  const schemaType = getJSONSchemaType(type);
  switch (schemaType) {
    case "object":
      return "{<object>}";
    case "array":
      if (
        typeof type.items === "object" &&
        !Array.isArray(type.items) &&
        type.items.type === "object"
      ) {
        return "[{<object1>}, {<object2>}, ...]";
      }
      return "[<value1>, <value2>, ...]";
    case "string":
      return ' {"value": "<string>"}';
    case "number":
    case "integer":
      return '{"value": <number>}';
    case "boolean":
      return '{"value": <true or false> }';
    case "null":
      return '{"value": null }';
  }
}
