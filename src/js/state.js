/**
 * state.js — Contenedor de estado reactivo en memoria para las notas.
 * 
 * Principio SRP: Su única responsabilidad es mantener y manipular el estado de las notas en memoria.
 * No realiza persistencia ni operaciones de I/O.
 */

let notes = [];
let activeId = null;

/**
 * Retorna una copia de la lista de notas en memoria.
 * @returns {object[]}
 */
export function getNotes() {
  return [...notes];
}

/**
 * Retorna el ID de la nota activa actual.
 * @returns {string|null}
 */
export function getActiveId() {
  return activeId;
}

/**
 * Retorna la nota activa actual o null si no hay ninguna.
 * @returns {object|null}
 */
export function getActiveNote() {
  return notes.find(n => n.id === activeId) ?? null;
}

/**
 * Establece la lista de notas en memoria.
 * @param {object[]} arr 
 */
export function setNotes(arr) {
  notes = arr;
}

/**
 * Establece el ID de la nota activa actual.
 * @param {string|null} id 
 */
export function setActiveId(id) {
  activeId = id;
}

/**
 * Agrega una nota al principio de la lista.
 * @param {object} note 
 */
export function addNote(note) {
  notes.unshift(note);
}

/**
 * Elimina una nota de la lista por su ID.
 * @param {string} id 
 */
export function removeNote(id) {
  notes = notes.filter(n => n.id !== id);
}

/**
 * Actualiza parcialmente una nota existente.
 * @param {string} id 
 * @param {object} changes 
 */
export function updateNote(id, changes) {
  const note = notes.find(n => n.id === id);
  if (note) Object.assign(note, changes);
}

/**
 * Ordena las notas por fecha de actualización descendente.
 */
export function sortByUpdated() {
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
}
