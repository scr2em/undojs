import { StoreApi } from "zustand";
import { ValueContainer } from "../types";

export function storeToValueContainer<T>(store: StoreApi<T>): ValueContainer<T> {
  return {
    get: () => {
      return store.getState();
    },
    set: (value) => {
      return store.setState(value);
    },
  };
}
