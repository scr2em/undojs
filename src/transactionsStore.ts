import { Transaction, TransactionsManager } from "./transactions";
import { createDraft, enablePatches, finishDraft, type Patch } from "immer";
import { TransactionsStoreObserverCallback, UnwrapContainers, ValueContainer } from "./types";

enablePatches();

export class TransactionsStore {
  readonly transactionManager = new TransactionsManager();

  private ephemeralUpdates = new WeakMap();
  private subscribers = new Set<TransactionsStoreObserverCallback>();

  public createTransaction<Containers extends ValueContainer<any>[]>(
    states: [...Containers],
    callback: (...values: UnwrapContainers<Containers>) => void,
    isEphemeral: boolean = false,
  ): void {
    type Values = UnwrapContainers<Containers>;
    const drafts = states.map((container) => createDraft(container.get())) as unknown as Values;

    callback(...drafts);

    const transaction = new Transaction();

    drafts.forEach((draft, index) => {
      const state = states[index];
      const finishedDraft = finishDraft(draft, (patches: Patch[], reversePatches: Patch[]) => {
        // ignore empty changes
        if (patches.length === 0) {
          return;
        }
        transaction.add({
          patches,
          reversePatches,
          container: state,
        });
      });

      if (isEphemeral) {
        const x = state.get();
        state.set(finishedDraft);

        if (this.ephemeralUpdates.has(state)) return;
        this.ephemeralUpdates.set(state, x);
      } else {
        if (this.ephemeralUpdates.has(state)) {
          throw "you have un committed ephemeral updates";
        }
      }
    });

    // don't create a transaction for ephemeral updates
    if (isEphemeral) {
      return;
    }

    this.transactionManager.add(transaction);
    this.publish();
  }

  public commitEphemeralUpdates<T extends Record<string, unknown>>(store: ValueContainer<T>): void {
    const initialValue = this.ephemeralUpdates.get(store);
    if (!initialValue) {
      throw "there are no ephemeral updates for this state to be committed";
    }
    this.ephemeralUpdates.delete(store);
    const lastValue = store.get();

    store.set(initialValue);
    this.createTransaction([store], (draft) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      draft = Object.assign(draft, lastValue);
    });
  }

  public discardEphemeralUpdates<T extends Record<string, unknown>>(store: ValueContainer<T>): void {
    const initialValue = this.ephemeralUpdates.get(store);
    if (!initialValue) {
      throw "there are no ephmeral updates for this state to be discarded";
    }
    this.ephemeralUpdates.delete(store);

    store.set(initialValue);
  }

  public undo(): void {
    this.transactionManager.undo();
    this.publish();
  }

  public redo(): void {
    this.transactionManager.redo();
    this.publish();
  }

  public reset(): void {
    this.transactionManager.reset();
    this.publish();
  }

  public clear(): void {
    this.transactionManager.clear();
    this.publish();
  }

  public canUndo(): boolean {
    return this.transactionManager.canUndo();
  }

  public canRedo(): boolean {
    return this.transactionManager.canRedo();
  }

  public subscribe(observerCb: TransactionsStoreObserverCallback): () => void {
    this.subscribers.add(observerCb);
    observerCb({
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
    return () => {
      this.subscribers.delete(observerCb);
    };
  }

  private publish(): void {
    this.subscribers.forEach((observer) =>
      observer({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      }),
    );
  }
}
