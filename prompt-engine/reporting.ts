import { ImaginaryFunctionDefinition, PromptEvent } from "@imaginary-dev/util";

export async function beginReportEvent(
  promptEventId: string,
  prompt: ImaginaryFunctionDefinition,
  params: Record<any, any>
) {
  const projectKey = process.env.PROMPT_PROJECT_KEY;
  if (!projectKey) {
    // no project to report on, so just skip reporting
    return;
  }
  const report: PromptEvent = {
    prompt,
    projectKey,
    promptEventId,
    params,
  };

  return sendEvent(report);
}
export async function finishReport(
  promptEventId: string,
  prompt: ImaginaryFunctionDefinition,
  params: Record<any, any>,
  requestTime: Date,
  response: string | null,
  errors?: string[]
) {
  const projectKey = process.env.PROMPT_PROJECT_KEY;
  if (!projectKey) {
    // no project to report on, so just skip reporting
    return;
  }
  const now = new Date().getTime();
  const responseTime = now - requestTime.getTime();
  const event: PromptEvent = {
    prompt,
    projectKey,
    promptEventId,
    params,
    response,
    responseTime,
    responseErrors: errors,
  };
  return sendEvent(event);
}
function sendEvent(event: PromptEvent) {
  const eventReportUrl = process.env.PROMPT_REPORTING_URL;
  if (!eventReportUrl) {
    // This is fatal because we shouldn't get here without this being set
    throw new Error("Missing PROMPT_REPORTING_URL");
  }
  return fetch(eventReportUrl, {
    body: JSON.stringify(event),
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
  });
}
export function reportEventErrors(
  beginEventPromise: Promise<Response | undefined>,
  finishEventPromise: Promise<Response | undefined>
) {
  Promise.allSettled([beginEventPromise, finishEventPromise]).then(
    (eventResults) => {
      eventResults
        .filter(
          (event): event is PromiseRejectedResult => event.status === "rejected"
        )
        .forEach((rejectedEvent) => {
          console.error("Failure to report events: ", rejectedEvent.reason);
        });
    }
  );
}
