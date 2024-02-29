import { TransactionsStore } from "./transactionsStore";
import { beforeEach, describe, expect, it } from "vitest";
import { createStore, Store } from "./createStore";

describe("Transaction Store: ", () => {
  let transactionStore: TransactionsStore;
  let mock1: Store<{ name: string; age: number }>;
  let mock2: Store<{ isPositiveAge: boolean }>;

  beforeEach(() => {
    transactionStore = new TransactionsStore();
    mock1 = createStore<{ name: string; age: number }>({ name: "ali", age: 99 });
    mock2 = createStore<{ isPositiveAge: boolean }>({ isPositiveAge: false });
  });

  it("should creates a new transaction", () => {
    transactionStore.createTransaction([mock1], (mock1) => {
      mock1.age = 100;
    });
    expect(mock1.get()).toEqual({ name: "ali", age: 100 });
  });

  it("should undo", () => {
    transactionStore.createTransaction([mock1], (mock1) => {
      mock1.age = 100;
    });
    expect(mock1.get()).toEqual({ name: "ali", age: 100 });
    transactionStore.undo();
    expect(mock1.get()).toEqual({ name: "ali", age: 99 });
  });

  it("should handle two states ", () => {
    transactionStore.createTransaction([mock1, mock2], (mock1, mock2) => {
      mock1.age = 100;
      mock2.isPositiveAge = true;
    });
    expect(mock1.get()).toEqual({ name: "ali", age: 100 });
    expect(mock2.get()).toEqual({ isPositiveAge: true });
    transactionStore.undo();
    expect(mock1.get()).toEqual({ name: "ali", age: 99 });
    expect(mock2.get()).toEqual({ isPositiveAge: false });
  });

  it("should undo two steps ", () => {
    transactionStore.createTransaction([mock1, mock2], (mock1, mock2) => {
      mock1.age = 100;
      mock2.isPositiveAge = true;
    });
    transactionStore.createTransaction([mock1, mock2], (mock1, mock2) => {
      mock1.age = 101;
      mock2.isPositiveAge = false;
    });
    expect(mock1.get()).toEqual({ name: "ali", age: 101 });
    expect(mock2.get()).toEqual({ isPositiveAge: false });
    transactionStore.undo();
    transactionStore.undo();
    expect(mock1.get()).toEqual({ name: "ali", age: 99 });
    expect(mock2.get()).toEqual({ isPositiveAge: false });
  });

  it("should redo", () => {
    transactionStore.createTransaction([mock1], (mock1) => {
      mock1.age = 100;
    });
    transactionStore.undo();
    expect(mock1.get()).toEqual({ name: "ali", age: 99 });
    transactionStore.redo();
    expect(mock1.get()).toEqual({ name: "ali", age: 100 });
  });

  it("should redo last undone change", () => {
    transactionStore.createTransaction([mock1], (mock1) => {
      mock1.age = 100;
    });
    transactionStore.createTransaction([mock1], (mock1) => {
      mock1.age = 101;
    });
    transactionStore.undo();
    expect(mock1.get()).toEqual({ name: "ali", age: 100 });
    transactionStore.redo();
    expect(mock1.get()).toEqual({ name: "ali", age: 101 });
  });

  it("should reset to initial state", () => {
    transactionStore.createTransaction([mock1, mock2], (mock1, mock2) => {
      mock1.age = 100;
      mock1.name = "karim";

      mock2.isPositiveAge = true;
    });
    transactionStore.createTransaction([mock1, mock2], (mock1, mock2) => {
      mock1.age = 10000;
      mock1.name = "hassan";

      mock2.isPositiveAge = true;
    });
    transactionStore.reset();
    expect(mock1.get()).toEqual({ name: "ali", age: 99 });
    expect(mock2.get()).toEqual({ isPositiveAge: false });
  });

  it("clear method prevent undo or redo", () => {
    expect(transactionStore.canUndo()).toEqual(false);
    transactionStore.createTransaction([mock1, mock2], (mock1) => {
      mock1.age = 100;
    });
    expect(transactionStore.canUndo()).toEqual(true);
    expect(transactionStore.canRedo()).toEqual(false);
    transactionStore.clear();
    expect(transactionStore.canUndo()).toEqual(false);
    expect(transactionStore.canRedo()).toEqual(false);
  });

  it("canUndo method works", () => {
    expect(transactionStore.canUndo()).toEqual(false);
    transactionStore.createTransaction([mock1], (mock1) => {
      mock1.age = 100;
    });
    expect(transactionStore.canUndo()).toEqual(true);
  });

  it("canRedo method works", () => {
    expect(transactionStore.canRedo()).toEqual(false);
    transactionStore.createTransaction([mock1], (mock1) => {
      mock1.age = 100;
    });
    expect(transactionStore.canRedo()).toEqual(false);
    transactionStore.undo();
    expect(transactionStore.canRedo()).toEqual(true);
  });

  it("should throw error when using there is no ephemeral updates ", () => {
    const coords = createStore<{ x: number; y: number }>({ x: 0, y: 0 });
    const transactionStore = new TransactionsStore();

    expect(() => transactionStore.commitEphemeralUpdates(coords)).toThrowError();
  });
  it("should throw error when using a regular transaction before committing existing ephemral updates ", () => {
    const coords = createStore<{ x: number; y: number }>({ x: 0, y: 0 });
    const transactionStore = new TransactionsStore();
    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.x = 5;
      },
      true,
    );

    expect(() => {
      transactionStore.createTransaction([coords], (coords) => {
        coords.x = 5;
      });
    }).toThrowError();
  });

  it("should commit correctly if the first updaate is ephemral", () => {
    const coords = createStore<{ x: number; y: number }>({ x: 0, y: 0 });
    const transactionStore = new TransactionsStore();

    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.x = 5;
      },
      true,
    );
    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.y = 6;
      },
      true,
    );
    transactionStore.commitEphemeralUpdates(coords);
    expect(transactionStore.transactionManager.currentStack).toHaveLength(1);
    expect(transactionStore.canUndo()).toEqual(true);
    expect(transactionStore.canRedo()).toEqual(false);
    expect(coords.get()).toEqual({ x: 5, y: 6 });
  });

  it("should commit correctly if the first update is not ephemral", () => {
    const coords = createStore<{ x: number; y: number }>({ x: 0, y: 0 });
    const transactionStore = new TransactionsStore();

    transactionStore.createTransaction([coords], (draft) => {
      draft.x = 3;
      draft.y = 3;
    });
    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.y = 6;
      },
      true,
    );
    expect(coords.get()).toEqual({ x: 3, y: 6 });

    transactionStore.commitEphemeralUpdates(coords);
    expect(coords.get()).toEqual({ x: 3, y: 6 });
    transactionStore.undo();

    expect(coords.get()).toEqual({ x: 3, y: 3 });
  });
  it("undo to the state at the moment of calling setCheckpoint", () => {
    const initalState = { x: 0, y: 0 };
    const coords = createStore<{ x: number; y: number }>({ x: 0, y: 0 });
    const transactionStore = new TransactionsStore();

    transactionStore.createTransaction(
      [coords],
      (draft) => {
        draft.x = 5;
      },
      true,
    );

    transactionStore.createTransaction(
      [coords],
      (draft) => {
        draft.y = 51;
      },
      true,
    );

    transactionStore.commitEphemeralUpdates(coords);
    expect(coords.get()).toEqual({ x: 5, y: 51 });

    transactionStore.undo();
    expect(coords.get()).toEqual(initalState);
  });

  it("should reset the checkpoint after commiting", () => {
    const initalState = { x: 0, y: 0 };
    const coords = createStore<{ x: number; y: number }>(initalState);
    const transactionStore = new TransactionsStore();

    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.x = 5;
      },
      true,
    );
    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.y = 6;
      },
      true,
    );
    expect(coords.get()).toEqual({ x: 5, y: 6 });

    transactionStore.commitEphemeralUpdates(coords);

    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.x = 10;
      },
      true,
    );
    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.y = 11;
      },
      true,
    );
    expect(coords.get()).toEqual({ x: 10, y: 11 });

    transactionStore.commitEphemeralUpdates(coords);
    expect(coords.get()).toEqual({ x: 10, y: 11 });
    transactionStore.undo();
    expect(coords.get()).toEqual({ x: 5, y: 6 });
    transactionStore.undo();
    expect(coords.get()).toEqual({ x: 0, y: 0 });
  });

  it("discards ehphermal updates if first update is ephemral", () => {
    const initalState = { x: 0, y: 0 };
    const coords = createStore<{ x: number; y: number }>(initalState);
    const transactionStore = new TransactionsStore();

    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.x = 5;
      },
      true,
    );
    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.y = 6;
      },
      true,
    );
    expect(coords.get()).toEqual({ x: 5, y: 6 });

    transactionStore.discardEphemeralUpdates(coords);

    expect(coords.get()).toEqual({ x: 0, y: 0 });
  });

  it("discards ehphermal updates if first update is not ephemeral", () => {
    const initalState = { x: 0, y: 0 };
    const coords = createStore<{ x: number; y: number }>(initalState);
    const transactionStore = new TransactionsStore();

    transactionStore.createTransaction([coords], (coords) => {
      coords.x = 3;
    });

    transactionStore.createTransaction(
      [coords],
      (coords) => {
        coords.y = 4;
      },
      true,
    );
    expect(coords.get()).toEqual({ x: 3, y: 4 });

    transactionStore.discardEphemeralUpdates(coords);

    expect(coords.get()).toEqual({ x: 3, y: 0 });
  });
});
