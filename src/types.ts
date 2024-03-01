import { type Patch } from "immer";

export type TransactionsStoreObserverCallback = ({ canUndo, canRedo }: { canUndo: boolean; canRedo: boolean }) => void;

/*
 this is basically to convert any state management's primitive to a simple object that has a get and a set
 */
export type ValueContainer<T> = {
  get(): T;
  set(value: T | ((prevState: T) => T)): void;
};
export type UnwrapContainers<Containers extends ValueContainer<unknown>[]> = {
  [Index in keyof Containers]: Containers[Index] extends { get: () => infer Value } ? Value : never;
};

export type TransactionChange = {
  patches: Patch[];
  reversePatches: Patch[];
  container: ValueContainer<Record<string, unknown>>;
};

export type StoreObserver<T> = (state: T, prevState: T) => void;

export type Store<T> = {
  get(): T;
  set(newValue: T | ((prevState: T) => T)): void;
  subscribe(listener: StoreObserver<T>): () => void;
};
