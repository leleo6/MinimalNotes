let notes = [];
let activeId = null;

function getRawNotes() {
  return [...notes];
}

export function getNotes() {
  return [...notes];
}

export function getActiveId() {
  return activeId;
}

export function getActiveNote() {
  return notes.find(n => n.id === activeId) ?? null;
}

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

export { getRawNotes };
