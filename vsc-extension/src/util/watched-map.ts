import vscode from "vscode";
import { TypedMap } from "./types";

export type TypedMapWithEvent<T extends object> = TypedMap<T> & {
  onStateChange: vscode.Event<Partial<T>>;
};

/** Create a Map that also fires `onStageChange` every time the map is updated */
export function createWatchedMap<T extends object>(
  state: TypedMap<T>
): TypedMapWithEvent<T> {
  const e = new vscode.EventEmitter<Partial<T>>();
  const handler: ProxyHandler<TypedMap<T>> = {
    get(target, p, receiver) {
      if (p === "set") {
        const wrapper: TypedMap<T>["set"] = (k, v) => {
          const realSet = Reflect.get(target, p, receiver).bind(target);
          realSet(k, v);
          e.fire({ [k]: v } as T);
          // make sure we're returning the wrapper
          return proxy;
        };
        return wrapper;
      }
      if (p === "onStateChange") {
        return e.event;
      }
      // https://javascript.info/proxy#built-in-objects-internal-slots
      const value = Reflect.get(target, p, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  };
  // eslint-disable-next-line no-undef
  const proxy = new Proxy(state, handler) as TypedMapWithEvent<T>;

  return proxy;
}
