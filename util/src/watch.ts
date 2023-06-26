/** Utilities for reporting back to the watcher */

import { ImaginaryFunctionDefinition } from "./function-definition";

export interface PromptEvent {
  prompt: ImaginaryFunctionDefinition;
  promptTemplateText?: string;

  params: Record<string, any>;
  projectKey: string;

  /** Unique Id linking prompt with reply */
  promptEventId: string;

  /** Included after response */
  response?: string | null;

  /** Response time in ms */
  responseTime?: number;
  /** Included only if there is an error from openai, or error in validation */
  responseErrors?: string[];
}
