/**
 * drag.js — Utilidad compartida de drag-to-open para nuevas ventanas.
 *
 * Principio DRY: la lógica de arrastrar un elemento fuera de sus
 * límites para abrirlo en una ventana nueva se define una sola vez.
 *
 * Principio SRP: única responsabilidad = manejar dragstart/dragend
 * y disparar openNoteWindow cuando corresponda.
 */

import { openNoteWindow } from './windows.js';

/**
 * Configura drag-to-open en un elemento.
 *
 * @param {HTMLElement} el        Elemento arrastrable
 * @param {string}      noteId    ID de la nota asociada
 * @param {function(MouseEvent, HTMLElement): boolean} isOutside
 *   Función que determina si el mouse está fuera de los límites
 *   que activan la apertura en nueva ventana.
 */
export function setupDragToOpen(el, noteId, isOutside) {
  const state = { noteId };

  el.draggable = true;

  el.addEventListener('dragstart', (e) => {
    state.noteId = noteId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', noteId);
    el.classList.add('dragging');
  });

  el.addEventListener('dragend', (e) => {
    el.classList.remove('dragging');
    if (state.noteId && isOutside(e, el)) {
      openNoteWindow(state.noteId);
    }
    state.noteId = null;
  });
}
