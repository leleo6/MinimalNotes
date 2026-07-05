import { openNoteWindow } from './windows.js';

export function setupDragToOpen(el, noteId, isOutside) {
  const state = { noteId };

  el.draggable = true;

  el.addEventListener('dragstart', (e) => {
    state.noteId = noteId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', noteId);
    el.classList.add('dragging');
  });

  el.addEventListener('dragend', async (e) => {
    el.classList.remove('dragging');
    if (state.noteId && isOutside(e, el)) {
      await openNoteWindow(state.noteId);
    }
    state.noteId = null;
  });
}
