import { enablePatches } from "immer";

enablePatches();

type Observer<T> = (state: T, prevState: T) => void;

export type Store<T> = {
  set: (partial: (state: T) => T) => void;
  get: () => T;
  subscribe: (listener: Observer<T>) => () => void;
};

export function createStore<T>(state: T): Store<T> {
  const subs: Set<Observer<T>> = new Set();
  return {
    get: () => {
      return state;
    },
    set: (partial) => {
      const prevState = state;

      if (typeof partial === "function") {
        state = partial(prevState);
      } else {
        state = partial;
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
