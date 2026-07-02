/**
 * state.js — Estado único y centralizado de la aplicación.
 *
 * Principio SRP: este módulo tiene una sola responsabilidad:
 * mantener y exponer el estado mutable de la app.
 *
 * Principio OCP: el estado se modifica solo a través de las
 * funciones exportadas; los consumidores no manipulan el objeto
 * directamente.
 */

/** @type {{ id: string, body: string, updatedAt: number }[]} */
let notes = [];

/** @type {string | null} */
let activeId = null;

// ---------- Getters ----------

export function getNotes() {
  return notes;
}

export function getActiveId() {
  return activeId;
}

export function getActiveNote() {
  return notes.find(n => n.id === activeId) ?? null;
}

// ---------- Setters ----------

export function setNotes(arr) {
  notes = arr;
}

export function setActiveId(id) {
  activeId = id;
}

export function addNote(note) {
  notes.unshift(note);
}

export function removeNote(id) {
  notes = notes.filter(n => n.id !== id);
}

export function updateNote(id, changes) {
  const note = notes.find(n => n.id === id);
  if (note) Object.assign(note, changes);
}

export function sortByUpdated() {
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
}
