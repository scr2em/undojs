import { applyPatches, enablePatches } from "immer";
import { nanoid } from "nanoid";
import { TransactionChange } from "./types";

enablePatches();

export class Transaction {
  readonly id: string = nanoid();
  readonly transactionChanges: TransactionChange[] = [];

  applyPatches() {
    for (const change of this.transactionChanges) {
      const value = applyPatches(change.container.get(), change.patches);
      change.container.set(value);
    }
  }
  applyReversePatches() {
    for (const change of this.transactionChanges) {
      const value = applyPatches(change.container.get(), change.reversePatches);
      change.container.set(value);
    }
  }
  add(change: TransactionChange) {
    this.transactionChanges.push(change);
  }
}

export class TransactionsManager {
  // private readonly max = 100
  readonly currentStack: Transaction[] = [];
  readonly undoneStack: Transaction[] = [];

  add(transaction: Transaction) {
    // ignore empty transactions
    if (transaction.transactionChanges.length === 0) {
      return;
    }
    transaction.applyPatches();
    this.currentStack.push(transaction);
    // if (this.currentStack.length > this.max) {
    //   this.currentStack.shift()
    // }
    // After we add a change, we can't redo something we have undone before.
    // It would make undo unpredictable, because there are new changes.
    this.undoneStack.splice(0);
  }
  undo() {
    const transaction = this.currentStack.pop();
    if (transaction === undefined) return;
    transaction.applyReversePatches();
    this.undoneStack.push(transaction);
  }

  redo() {
    const transaction = this.undoneStack.pop();
    if (transaction === undefined) return;
    transaction.applyPatches();
    this.currentStack.push(transaction);
  }

  reset() {
    // TODO: merge the patches and apply them once, instead of applying each patch
    for (let i = this.currentStack.length - 1; i >= 0; i--) {
      const transaction = this.currentStack[i];
      transaction.applyReversePatches();
      this.undoneStack.push(transaction);
    }
    this.currentStack.splice(0);
  }

  canUndo() {
    return this.currentStack.length > 0;
  }

  canRedo() {
    return this.undoneStack.length > 0;
  }

  clear() {
    // we need the reference to remain the same
    this.currentStack.splice(0);
    this.undoneStack.splice(0);
  }
}
