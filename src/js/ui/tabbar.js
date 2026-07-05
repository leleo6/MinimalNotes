import { getNotes, getActiveId, setActiveId } from '../state.js';
import { excerpt } from '../utils.js';
import { deleteNote } from '../notes.js';
import { openNoteWindow } from '../windows.js';
import { setupDragToOpen } from '../drag.js';

export function renderTabbar(callbacks) {
  const container = document.getElementById('tabbar');
  if (!container) return;
  if (container.classList.contains('hidden')) return;

  const notes = getNotes();
  const activeId = getActiveId();

  container.style.display = notes.length <= 1 ? 'none' : '';

  container.innerHTML = '';
  notes.forEach(note => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (note.id === activeId ? ' active' : '');
    tab.dataset.noteId = note.id;

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = excerpt(note.body);
    tab.appendChild(label);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    closeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteNote(note.id);
      if (callbacks.onDeleteNote) callbacks.onDeleteNote();
    });
    tab.appendChild(closeBtn);

    tab.addEventListener('click', () => {
      setActiveId(note.id);
      if (callbacks.onSelectNote) callbacks.onSelectNote();
    });

    tab.addEventListener('dblclick', async () => {
      await openNoteWindow(note.id);
    });

    setupDragToOpen(tab, note.id, (e) => {
      const rect = container.getBoundingClientRect();
      return e.clientX < rect.left || e.clientX > rect.right ||
             e.clientY < rect.top || e.clientY > rect.bottom;
    });

    container.appendChild(tab);
  });
}
