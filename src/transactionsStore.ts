import { Transaction, TransactionsManager, ValueContainer } from "./transactions";
import { createDraft, enablePatches, finishDraft, type Patch } from "immer";

enablePatches();

type UnwrapContainers<Containers extends ValueContainer<unknown>[]> = {
  [Index in keyof Containers]: Containers[Index] extends { get: () => infer Value } ? Value : never;
};

type TransactionsStoreObserverCallback = ({ canUndo, canRedo }: { canUndo: boolean; canRedo: boolean }) => void;

/**
 * This module handles the implementation of builder actions and their tracking for undo/redo functionality.
 *
 * Considerations:
 *  1. Builder actions are categorized into:
 *     a. Trackable actions: Actions that need to be tracked for undo/redo functionality. Some actions
 *        may be triggered programmatically and don't require tracking.
 *     b. Un-trackable actions: Actions that are not tracked for undo/redo functionality.
 *
 *  2. Composite actions: Actions may consist of multiple sub-actions. For instance, deleting a
 *     selected element involves:
 *        a. Deleting the element.
 *        b. Setting the selected element to null.
 *     Undoing this action requires reversing all sub-actions as a group.
 *
 *  3. Transactional actions: Actions should be executed as part of a transaction, allowing them to be
 *     undone or redone as a whole.
 */
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
