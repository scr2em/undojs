import { StoreObserver, Store } from "./types";

export function createStore<T>(state: T): Store<T> {
  const subs: Set<StoreObserver<T>> = new Set();
  return {
    get: () => {
      return state;
    },
    set: (newValue) => {
      const prevState = state;

      if (typeof newValue === "function") {
        // TODO
        // @ts-expect-error
        state = newValue(prevState);
      } else {
        state = newValue;
      }

      subs.forEach((listener) => {
        listener(state, prevState);
      });
    },
    subscribe: (listener) => {
      subs.add(listener);
      return () => subs.delete(listener);
    },
  };
}
