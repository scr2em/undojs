import { Transaction, TransactionsManager } from "./transactions";
import { Patch } from "immer";
import { beforeEach, describe, expect, it } from "vitest";

// Mock ValueContainer
class MockValueContainer<T> {
  private value: T;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    this.value = newValue;
  }
}

describe("Transaction", () => {
  let transaction: Transaction;
  beforeEach(() => {
    transaction = new Transaction();
  });

  it("initializes with a unique UUID and an empty specs array", () => {
    expect(transaction.id).toBeTypeOf("string");
    expect(transaction.transactionChanges).toEqual([]);
  });

  it("applies patches correctly", () => {
    const mockContainer = new MockValueContainer({});
    const patches: Patch[] = [{ op: "add", path: ["test"], value: "value" }];

    transaction.add({ patches, reversePatches: [], container: mockContainer });
    transaction.applyPatches();
    expect(mockContainer.get()).toEqual({ test: "value" });
  });
  it("applies reverse patches correctly", () => {
    const mockContainer = new MockValueContainer({ test: "value" });
    const reversePatches: Patch[] = [{ op: "remove", path: ["test"] }];

    transaction.add({ patches: [], reversePatches, container: mockContainer });
    transaction.applyReversePatches();
    expect(mockContainer.get()).toEqual({});
  });

  it("applies patches and reversePatches", () => {
    const mockContainer = new MockValueContainer({});
    const patches: Patch[] = [{ op: "add", path: ["test"], value: "value" }];
    const reversePatches: Patch[] = [{ op: "remove", path: ["test"] }];
    transaction.add({ patches, reversePatches, container: mockContainer });
    transaction.applyPatches();
    expect(mockContainer.get()).toEqual({ test: "value" });
    transaction.applyReversePatches();
    expect(mockContainer.get()).toEqual({});
  });
});

describe("TransactionsManager", () => {
  let manager: TransactionsManager;
  beforeEach(() => {
    manager = new TransactionsManager();
  });

  it("initializes with empty currentStack and undoneStack arrays", () => {
    expect(manager.currentStack).toEqual([]);
    expect(manager.undoneStack).toEqual([]);
  });
  describe(".add -", () => {
    it("it ignores empty transactions", () => {
      const transaction = new Transaction();
      manager.add(transaction);
      expect(manager.currentStack).toEqual([]);
    });

    it("it does nothing when calling undo and history is empty", () => {
      manager.undo();
      expect(manager.currentStack).toEqual([]);
      expect(manager.undoneStack).toEqual([]);
    });

    it("it does nothing when calling redo and history is empty", () => {
      manager.redo();
      expect(manager.currentStack).toEqual([]);
      expect(manager.undoneStack).toEqual([]);
    });

    it("adds a transaction and applies patches and empty the undone stack", () => {
      const mockContainer = new MockValueContainer({});
      const patches: Patch[] = [{ op: "add", path: ["test"], value: "value" }];
      const transaction = new Transaction();

      transaction.add({ patches, reversePatches: [], container: mockContainer });
      manager.add(transaction);

      expect(manager.currentStack).toContain(transaction);
      expect(mockContainer.get()).toEqual({ test: "value" });
      expect(manager.undoneStack).toHaveLength(0);
    });
  });
  it(".undo - it undo the last transaction", () => {
    const initialState = {};
    const mockContainer = new MockValueContainer(initialState);
    const transaction = new Transaction();
    const patches: Patch[] = [{ op: "add", path: ["test"], value: "value" }];
    const reversePatches: Patch[] = [{ op: "remove", path: ["test"] }];
    transaction.add({ patches, reversePatches, container: mockContainer });

    manager.add(transaction);
    expect(mockContainer.get()).toEqual({ test: "value" });
    expect(manager.currentStack).toHaveLength(1);
    expect(manager.undoneStack).toHaveLength(0);
    manager.undo();
    expect(manager.currentStack).toHaveLength(0);
    expect(manager.undoneStack).toHaveLength(1);
    expect(mockContainer.get()).toEqual(initialState);
  });
  it(".redo - it redo the last undone transaction", () => {
    const mockContainer = new MockValueContainer({});
    const transaction = new Transaction();
    const patches: Patch[] = [{ op: "add", path: ["test"], value: "value" }];
    const reversePatches: Patch[] = [{ op: "remove", path: ["test"] }];
    transaction.add({ patches, reversePatches, container: mockContainer });

    manager.add(transaction);
    expect(mockContainer.get()).toEqual({ test: "value" });
    expect(manager.currentStack).toHaveLength(1);
    expect(manager.undoneStack).toHaveLength(0);
    manager.undo();
    expect(manager.currentStack).toHaveLength(0);
    expect(manager.undoneStack).toHaveLength(1);
    manager.redo();
    expect(manager.currentStack).toHaveLength(1);
    expect(manager.undoneStack).toHaveLength(0);
    expect(mockContainer.get()).toEqual({ test: "value" });
  });
  it(".clear - it clears both currentStack and undoneStack ", () => {
    const mockContainer = new MockValueContainer({});
    function generateTransaction() {
      const transaction = new Transaction();
      const patches: Patch[] = [{ op: "add", path: ["test"], value: "value" }];
      const reversePatches: Patch[] = [{ op: "remove", path: ["test"] }];
      transaction.add({ patches, reversePatches, container: mockContainer });
      return transaction;
    }

    const transaction1 = generateTransaction();
    const transaction2 = generateTransaction();

    manager.add(transaction1);
    manager.add(transaction2);
    expect(manager.currentStack).toHaveLength(2);
    manager.undo();
    expect(manager.currentStack).toHaveLength(1);
    expect(manager.undoneStack).toHaveLength(1);
    manager.clear();
    expect(manager.currentStack).toHaveLength(0);
    expect(manager.undoneStack).toHaveLength(0);
  });

  it(".reset - it resets the state to the original one", () => {
    const initialValue = {};
    const mockContainer = new MockValueContainer(initialValue);
    const transaction1 = new Transaction();
    const patches1: Patch[] = [{ op: "add", path: ["test"], value: "value" }];
    const reversePatches1: Patch[] = [{ op: "remove", path: ["test"] }];
    transaction1.add({
      patches: patches1,
      reversePatches: reversePatches1,
      container: mockContainer,
    });

    const transaction2 = new Transaction();
    const patches2: Patch[] = [{ op: "add", path: ["name"], value: "my-name" }];
    const reversePatches2: Patch[] = [{ op: "remove", path: ["name"] }];
    transaction2.add({
      patches: patches2,
      reversePatches: reversePatches2,
      container: mockContainer,
    });

    manager.add(transaction1);
    manager.add(transaction2);
    expect(manager.currentStack).toHaveLength(2);
    expect(mockContainer.get()).toEqual({ test: "value", name: "my-name" });
    manager.reset();
    expect(manager.currentStack).toHaveLength(0);
    expect(manager.undoneStack).toHaveLength(2);
    expect(mockContainer.get()).toEqual(initialValue);
  });

  it("should be able to undo if currentStack.length > 0", () => {
    const initialState = {};
    const mockContainer = new MockValueContainer(initialState);
    const transaction = new Transaction();
    const patches: Patch[] = [{ op: "add", path: ["age"], value: "30" }];
    const reversePatches: Patch[] = [{ op: "remove", path: ["age"] }];
    transaction.add({
      patches: patches,
      reversePatches: reversePatches,
      container: mockContainer,
    });
    expect(manager.canUndo()).toEqual(false);
    manager.add(transaction);
    expect(manager.canUndo()).toEqual(true);
  });

  it("should be able to redo if undoneStack.length > 0", () => {
    const initialState = {};
    const mockContainer = new MockValueContainer(initialState);
    const transaction = new Transaction();
    const patches: Patch[] = [{ op: "add", path: ["age"], value: "30" }];
    const reversePatches: Patch[] = [{ op: "remove", path: ["age"] }];
    transaction.add({
      patches: patches,
      reversePatches: reversePatches,
      container: mockContainer,
    });
    expect(manager.canRedo()).toEqual(false);
    manager.add(transaction);
    expect(manager.canRedo()).toEqual(false);
    manager.undo();
    expect(manager.canRedo()).toEqual(true);
  });

  it("shouldn't be able to redo whenever the user takes a new action", () => {
    const initialState = {};
    const mockContainer = new MockValueContainer(initialState);
    const transaction1 = new Transaction();
    const transaction2 = new Transaction();
    const patches1: Patch[] = [{ op: "add", path: ["age"], value: "30" }];
    const reversePatches1: Patch[] = [{ op: "remove", path: ["age"] }];
    transaction1.add({
      patches: patches1,
      reversePatches: reversePatches1,
      container: mockContainer,
    });
    manager.add(transaction1);
    manager.undo();
    expect(manager.canRedo()).toEqual(true);
    const patches2: Patch[] = [{ op: "add", path: ["name"], value: "Hassan" }];
    const reversePatches2: Patch[] = [{ op: "remove", path: ["name"] }];
    transaction2.add({
      patches: patches2,
      reversePatches: reversePatches2,
      container: mockContainer,
    });
    manager.add(transaction2);
    expect(manager.canRedo()).toEqual(false);
  });

  it("shouldn't be able to undo or redo after clear", () => {
    const mockContainer = new MockValueContainer({});
    const transaction = new Transaction();
    const patches: Patch[] = [{ op: "add", path: ["age"], value: "30" }];
    const reversePatches: Patch[] = [{ op: "remove", path: ["age"] }];
    transaction.add({
      patches: patches,
      reversePatches: reversePatches,
      container: mockContainer,
    });
    expect(manager.canRedo()).toEqual(false);
    expect(manager.canUndo()).toEqual(false);
    manager.add(transaction);
    expect(manager.canUndo()).toEqual(true);
    manager.undo();
    expect(manager.canRedo()).toEqual(true);
    expect(manager.canUndo()).toEqual(false);
    manager.clear();
    expect(manager.canRedo()).toEqual(false);
    expect(manager.canUndo()).toEqual(false);
  });
});
