import { STATUS_CODES } from "http";
import { TrimType } from "./prompt";

export const trim = (str: string, trimType: TrimType): string => {
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

export function getHttpErrorMessage(statusCode: number) {
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

export class PromptError extends Error {
  status: number;
  error: Error;
  constructor(message: string, error: any) {
    super();
    this.message = message;
    this.status = error.status;
    this.error = error;
  }
}
