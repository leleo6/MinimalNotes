const MAX_HISTORY = 500;

const undoStacks = new Map();
const redoStacks = new Map();

export function getUndoStack(noteId) {
  if (!undoStacks.has(noteId)) undoStacks.set(noteId, []);
  return undoStacks.get(noteId);
}

function getRedoStack(noteId) {
  if (!redoStacks.has(noteId)) redoStacks.set(noteId, []);
  return redoStacks.get(noteId);
}

export function pushSnapshot(noteId, body) {
  const stack = getUndoStack(noteId);
  if (stack.length > 0 && stack[stack.length - 1] === body) return;
  stack.push(body);
  if (stack.length > MAX_HISTORY) stack.shift();
  getRedoStack(noteId).length = 0;
}

export function undo(noteId) {
  const stack = getUndoStack(noteId);
  if (stack.length === 0) return null;
  const current = stack.pop();
  const redo = getRedoStack(noteId);
  redo.push(current);
  if (redo.length > MAX_HISTORY) redo.shift();
  return stack.length > 0 ? stack[stack.length - 1] : '';
}

export function redo(noteId) {
  const redo = getRedoStack(noteId);
  if (redo.length === 0) return null;
  const next = redo.pop();
  const stack = getUndoStack(noteId);
  stack.push(next);
  if (stack.length > MAX_HISTORY) stack.shift();
  return next;
}

export function clearHistory(noteId) {
  undoStacks.delete(noteId);
  redoStacks.delete(noteId);
}
