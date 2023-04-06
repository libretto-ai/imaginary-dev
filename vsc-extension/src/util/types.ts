export interface TypedMap<O extends object> extends Map<keyof O, O[keyof O]> {
  set<K extends keyof O>(k: K, v: O[K]): this;
  get<K extends keyof O>(k: K): O[K];
}
