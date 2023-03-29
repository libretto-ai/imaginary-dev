declare global {
  interface VSCodeWebViewApi {
    getState(): {
      [key: string]: unknown;
    };
    setState(data: { [key: string]: unknown }): void;
    postMessage: (msg: unknown) => void;
  }

  const acquireVsCodeApi: () => VSCodeWebViewApi;
}
export {};
