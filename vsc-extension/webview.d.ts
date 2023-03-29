declare global {
  interface VSCodeWebViewApi<
    S extends { [key: string]: unknown },
    M = unknown
  > {
    getState(): S;
    setState(data: Partial<S>): void;
    postMessage(msg: M): void;
  }

  function acquireVsCodeApi<
    S extends { [key: string]: unknown } = { [key: string]: unknown }
  >(): VSCodeWebViewApi<S>;
}
export {};
