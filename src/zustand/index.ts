import { ValueContainer } from "../transactions";
import { StoreApi } from "zustand";

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
