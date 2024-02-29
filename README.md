

### Features:
1. works with any state management.
2. supports tracking single or multiple states.
3. Undo/Redo/Reset functionalities.
4. produce changes diff.
5. minimal updates to the state when redo-ing & undo-ing
6. integration with React (other frameworks soon, feel free to create a PR).
7. Ephemeral updates*. 
8. comes with a simple store.
9. change the state mutably.
10. 100% Type-safe.
11. support top-bottom or bottom-up state management approaches


```ts
import { TransactionsStore , createStore} from 'undojs'

const ts = new TransactionsStore()

const store = createStore({ x: 1 })

ts.createTransaction([store], (draft) => {
  draft.x = 10
})
// store => { x:10 }
ts.undo()
// store => { x: 1 }
ts.redo()
// store => { x: 10 }

```

### Summary:
Imagine you are building landing page builder and you want to support undo/redo. You will have 3 types
of actions:
1. Actions you want to track (We call them transactions)
2. Actions you don't want to track 
3. Actions you may or may not want to track, For example, a user is dragging an element, you don't want to create a history for each change, you only care about the last position or you can discard those changes and reset the dragged element to its position before the dragging. 

Example: single state
```ts
import { TransactionsStore , createStore} from 'undojs'

// the main object that will holds the entire history
const ts = new TransactionsStore()

const store = createStore({ x: 1 })

// 1. actions we don't want to track
store.set({x:2})

// 2. actions we are tracking
ts.createTransaction([store], (draft) => {
  // change the state mutably
  draft.x = 10
})
// store => { x:10 }
ts.undo()
// store => { x: 2 }
ts.redo()
// store => { x: 10 }
```

Example: multiple states
```ts
import { TransactionsStore , createStore} from 'undojs'

const ts = new TransactionsStore()

const user = createStore({ name: 'Jo' })
const machine = createStore({ model: 'P1' })


ts.createTransaction([user, machine], (userDraft, machineDraft) => {
  userDraft.name = 'John'
  machineDraft.model = 'XY'
})
/*
user => { name: 'John' }
machine => { model: 'XY' }
 */
ts.undo();
/*
user => { name: 'Jo' }
machine => { model: 'P1' }
 */



```

Example: Ephemeral updates
```ts
import { TransactionsStore , createStore} from 'undojs'

const ts = new TransactionsStore()

const dragged = createStore({ x: 0, y: 0 })

// the user starts to drag the element
ts.createTransaction(
  [dragged],
  (draggedDraft) => {
      draggedDraft.x = 1
      draggedDraft.y = 4
  },
  true // <------- marked as ephemeral
);

// ... another x1000000 drag events emitted 

/* there are 2 roads here:
  1. the user press Esc to cancel the dragging and revert to the position before the drag started
  2. the user wants the final position
  
  So, we can either commit or discard the changes
 */

ts.commitEphemeralUpdates(dragged);

// or 

ts.discardEphemeralUpdates(dragged);


```