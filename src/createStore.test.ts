import { describe, expect, it, vi } from "vitest";
import { createStore } from "./createStore";

describe("createStore", () => {
  it("creates a store with an initial value", () => {
    const initialValue = { a: 1 };
    const store = createStore(initialValue);
    expect(store.get()).toEqual(initialValue);
  });
  describe("with primitive value", () => {
    it("sets a primitive value in the store (number)", () => {
      const store = createStore(10);
      expect(store.get()).toBe(10);
    });

    it("updates state with a function parameter prev => prev + number", () => {
      const store = createStore(10);
      store.set((prevState) => prevState + 5);
      expect(store.get()).toBe(15);
    });

    it("updates state with a function parameter ()=> number", () => {
      const store = createStore(10);
      store.set(() => 23);
      expect(store.get()).toBe(23);
    });
  });
  describe("with non primitive value", () => {
    it("sets a new value in the store with partial (object)", () => {
      const store = createStore({ a: 1, b: 5 });
      store.set((prev) => ({
        ...prev,
        a: 2,
      }));
      expect(store.get()).toEqual({ a: 2, b: 5 });
    });

    it("updates an object state with () => partial", () => {
      const store = createStore({ a: 1, b: 99 });
      store.set((prev) => ({ ...prev, a: 12 }));
      expect(store.get()).toEqual({ a: 12, b: 99 });
    });
  });

  it("subscribes and triggers listener on state change", () => {
    const store = createStore(0);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set(() => 1);
    expect(listener).toHaveBeenCalled();
  });
});
