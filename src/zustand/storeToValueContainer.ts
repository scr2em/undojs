import { StoreApi } from "zustand";
import { ValueContainer } from "../types";

export function storeToValueContainer<T>(store: StoreApi<T>): ValueContainer<T> {
  return {
    get: (): T => {
      return store.getState();
    },
    set: (value: T) => {
      return store.setState(value);
    },
  };
}
