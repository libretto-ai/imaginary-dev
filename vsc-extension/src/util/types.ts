export interface TypedMap<O extends object> extends Map<keyof O, O[keyof O]> {
  set<K extends keyof O>(k: K, v: O[K]): this;
  get<K extends keyof O>(k: K): O[K];
}

export interface RpcCaller<
  I extends {
    [k: string]: (...params: any[]) => Promise<any>;
  }
> {
  rpc: <K extends keyof I, P extends Parameters<I[K]>>(
    id: K,
    parameters: P[0],
    t?: Array<any>
  ) => Promise<ReturnType<I[K]>>;
}
