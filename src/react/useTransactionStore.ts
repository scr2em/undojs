import { useEffect, useState } from "react";
import { TransactionsStore } from "../transactionsStore";
/**
 * A React hook that provides an interface for managing transaction states and actions.
 *
 * This hook subscribes to a `transactionsStore` to keep track of the ability to undo and redo transactions.
 * It provides `undo` and `redo` functions which are bound to the corresponding methods of the `transactionsStore`.
 * calling these functions without being bound, will throw an error transactionsStore is not defined
 *
 * @example
 * const { canUndo, canRedo, undo, redo } = useTransactionStore();
 */
export function useTransactionStore(transactionsStore: TransactionsStore): {
  canUndo: boolean;
  canRedo: boolean;
} {
  const [state, setState] = useState<{ canUndo: boolean; canRedo: boolean }>({ canUndo: false, canRedo: false });

  useEffect(() => {
    const unsubscribe = transactionsStore.subscribe((newValue) => {
      setState(newValue);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
