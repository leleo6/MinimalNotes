/**
 * sidebar.js — Renderizado y eventos del sidebar.
 *
 * Principio SRP: única responsabilidad = mostrar la lista de
 * notas y los spine dots, y disparar callbacks de selección.
 * No contiene lógica de negocio ni de persistencia.
 */

import { getNotes, getActiveId, setActiveId } from '../state.js';
import { relativeTime, excerpt } from '../utils.js';

/**
 * @typedef {Object} SidebarCallbacks
 * @property {() => void} onNewNote
 * @property {() => void} onSelectNote — se llama después de cambiar activeId
 */

/**
 * Renderiza el sidebar completo (solo spine dots).
 * @param {SidebarCallbacks} callbacks
 */
export function renderSidebar(callbacks) {
  renderSpine(callbacks);
}

/**
 * Renderiza los spine dots (uno por nota).
 * @param {SidebarCallbacks} callbacks
 */
export function renderSpine(callbacks) {
  const spine = document.getElementById('spine');
  if (!spine) return;

  spine.innerHTML = '';
  const notes    = getNotes();
  const activeId = getActiveId();

  // Ocultar la barra lateral cuando solo hay una nota: no hay nada que navegar
  spine.style.display = notes.length <= 1 ? 'none' : '';

  notes.forEach(note => {
    const dot = document.createElement('button');
    dot.className   = 'spine-dot' + (note.id === activeId ? ' active' : '');
    dot.setAttribute('aria-label', note.body.slice(0, 40) || 'Nota vacía');
    dot.title       = note.body.slice(0, 60) || 'Nota vacía';
    dot.addEventListener('click', () => {
      setActiveId(note.id);
      callbacks.onSelectNote();
    });
    spine.appendChild(dot);
  });
}
