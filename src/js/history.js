/**
 * history.js — Historial de cambios (Undo / Redo) por nota.
 * 
 * Principio SRP: Responsable exclusivo de registrar snapshots de texto y realizar navegación de historial.
 * Principio DRY: Reutiliza el generador de pilas con un helper unificado.
 */

const MAX_HISTORY = 500;

const undoStacks = new Map();
const redoStacks = new Map();

// Cierre temporal de una sola vía para prevenir que la pila de redo se limpie al navegar el historial
const _redoLockIds = new Set();

/**
 * Bloquea temporalmente el vaciado de la pila de rehacer para un ID de nota.
 * @param {string} noteId 
 */
export function lockRedoStack(noteId) {
  _redoLockIds.add(noteId);
}

/**
 * Helper DRY para obtener o crear una pila de historial específica.
 * @param {Map} map 
 * @param {string} key 
 * @returns {any[]}
 */
function getOrCreateStack(map, key) {
  if (!map.has(key)) map.set(key, []);
  return map.get(key);
}

/**
 * Obtiene la pila de deshacer de una nota.
 */
const getUndoStack = (noteId) => getOrCreateStack(undoStacks, noteId);

/**
 * Obtiene la pila de rehacer de una nota.
 */
const getRedoStack = (noteId) => getOrCreateStack(redoStacks, noteId);

/**
 * Agrega un snapshot de texto al historial de la nota.
 * @param {string} noteId 
 * @param {string} body 
 */
export function pushSnapshot(noteId, body) {
  const stack = getUndoStack(noteId);
  if (stack.length > 0 && stack[stack.length - 1] === body) return;
  stack.push(body);
  if (stack.length > MAX_HISTORY) stack.shift();
  
  if (_redoLockIds.has(noteId)) {
    _redoLockIds.delete(noteId); // Auto-liberado en el primer salto
  } else {
    getRedoStack(noteId).length = 0;
  }
}

/**
 * Revierte al último snapshot en el historial de la nota.
 * @param {string} noteId 
 * @returns {string|null} El texto resultante o null si no se puede deshacer.
 */
export function undo(noteId) {
  const stack = getUndoStack(noteId);
  if (stack.length === 0) return null;
  const current = stack.pop();
  const redoStack = getRedoStack(noteId);
  redoStack.push(current);
  if (redoStack.length > MAX_HISTORY) redoStack.shift();
  return stack.length > 0 ? stack[stack.length - 1] : '';
}

/**
 * Aplica el siguiente snapshot revertido de la nota.
 * @param {string} noteId 
 * @returns {string|null} El texto resultante o null si no se puede rehacer.
 */
export function redo(noteId) {
  const redoStack = getRedoStack(noteId);
  if (redoStack.length === 0) return null;
  const next = redoStack.pop();
  const stack = getUndoStack(noteId);
  stack.push(next);
  if (stack.length > MAX_HISTORY) stack.shift();
  return next;
}

/**
 * Limpia todo el historial registrado para una nota (previene memory leaks al eliminar notas).
 * @param {string} noteId 
 */
export function clearHistory(noteId) {
  undoStacks.delete(noteId);
  redoStacks.delete(noteId);
}
