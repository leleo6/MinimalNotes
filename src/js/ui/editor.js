/**
 * editor.js — Renderizado y eventos del panel de edición.
 *
 * Principio SRP: única responsabilidad = mostrar el editor
 * y manejar la escritura del usuario. No gestiona persistencia
 * ni el estado global directamente.
 */

import { getActiveNote } from '../state.js';
import { wordCount } from '../utils.js';
import { updateNoteBody, deleteNote } from '../notes.js';
import { pushSnapshot } from '../history.js';
import { isSearchOpen, renderSearchPanel } from './search.js';

export let zoomLevel = 100;

export function setZoomLevel(val) {
  zoomLevel = Math.max(80, Math.min(200, val));
}

export function changeZoom(delta) {
  setZoomLevel(zoomLevel + delta);
  applyZoom();
}

export function resetZoom() {
  zoomLevel = 100;
  applyZoom();
}

function applyZoom() {
  const wrap = document.querySelector('.editor-body-wrap');
  if (wrap) {
    wrap.style.zoom = zoomLevel + '%';
  }
  const indicator = document.getElementById('zoomIndicator');
  if (indicator) {
    indicator.textContent = zoomLevel + '%';
  }
}

/**
 * @typedef {Object} EditorCallbacks
 * @property {() => void} onNewNote
 * @property {() => void} onDeleteNote
 * @property {() => void} onInput
 * @property {() => void} onOpenFile
 * @property {() => void} onSaveNote
 * @property {() => void} onOpenSettings — abre la ventana de configuración
 * @property {() => void} onToggleSearch
 */

/**
 * Renderiza el estado del editor según la nota activa.
 * @param {EditorCallbacks} callbacks
 */
export function renderEditor(callbacks) {
  const pane = document.getElementById('editorPane');
  if (!pane) return;

  const note = getActiveNote();

  if (!note) {
    renderEmptyEditor(pane, callbacks);
    return;
  }

  renderActiveEditor(pane, note, callbacks);
}

// ---------- Privados ----------

function renderEmptyEditor(pane, callbacks) {
  pane.innerHTML = `
    <div class="empty-editor">
      <div class="empty-editor-glyph">¶</div>
      <p>Elige una nota o crea una nueva para empezar a escribir.</p>
      <div style="display: flex; gap: 8px;">
        <button class="icon-btn icon-btn--add" id="emptyNewBtn" aria-label="Nueva nota" title="Nueva nota">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="icon-btn" id="emptyOpenBtn" aria-label="Abrir archivo" title="Abrir archivo (Ctrl+O)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.getElementById('emptyNewBtn').addEventListener('click', callbacks.onNewNote);
  document.getElementById('emptyOpenBtn').addEventListener('click', callbacks.onOpenFile);
}

function renderActiveEditor(pane, note, callbacks) {
  pane.innerHTML = `
    <!-- FAB: botón flotante de acciones -->
    <div class="action-menu-container" id="actionMenuContainer">
      <button class="menu-trigger-btn" id="menuTrigger" aria-label="Acciones" title="Ver acciones">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="action-menu-dropdown" id="actionDropdown">
        <button class="icon-btn icon-btn--add" id="btnNew" aria-label="Nueva nota" title="Nueva nota (Ctrl+N)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="icon-btn" id="btnOpen" aria-label="Abrir archivo" title="Abrir archivo (Ctrl+O)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
        <button class="icon-btn" id="btnSave" aria-label="Guardar cambios" title="Guardar cambios (Ctrl+S)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <button class="icon-btn icon-btn--del" id="btnDelete" aria-label="Eliminar nota" title="Eliminar nota">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="editor-scroll">
      <div class="editor-body-wrap">
        <textarea
          class="body-input"
          id="bodyInput"
          placeholder="Escribe algo…"
          spellcheck="true"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
        ></textarea>
      </div>
    </div>

    <div id="searchPanel" class="search-panel"></div>

    <footer class="editor-footer">
      <button class="settings-fab" id="btnSettings" aria-label="Configuración" title="Configuración">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
      <span class="word-count" id="wordCountEl">${wordCount(note.body)} palabras</span>
      <span class="zoom-indicator" id="zoomIndicator">${zoomLevel}%</span>
      <span class="save-indicator" id="saveIndicator">✓ guardado</span>
    </footer>
  `;

  // Establecer el valor directamente (evitar escapeHtml en textarea — es seguro)
  const bodyInput     = document.getElementById('bodyInput');
  const wordCountEl   = document.getElementById('wordCountEl');
  const saveIndicator = document.getElementById('saveIndicator');

  bodyInput.value = note.body ?? '';
  autoGrow(bodyInput);

  // Enfocar al final del texto
  requestAnimationFrame(() => {
    bodyInput.focus();
    bodyInput.setSelectionRange(bodyInput.value.length, bodyInput.value.length);
  });

  // Evento de escritura
  bodyInput.addEventListener('input', () => {
    updateNoteBody(note.id, bodyInput.value);
    wordCountEl.textContent = `${wordCount(bodyInput.value)} palabras`;
    autoGrow(bodyInput);
    showSaveIndicator(saveIndicator);
    callbacks.onInput();
  });

  // Push snapshot on input for undo (debounced)
  let snapTimer;
  bodyInput.addEventListener('input', () => {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      if (!note) return;
      pushSnapshot(note.id, bodyInput.value);
    }, 300);
  });

  // Undo/Redo via Ctrl+Z / Ctrl+Y handled in main.js (global)
  // But we need to expose a way for main.js to trigger undo/redo on the active note

  // Apply zoom on render
  applyZoom();

  // Restore search panel state
  if (isSearchOpen) {
    const sp = document.getElementById('searchPanel');
    if (sp) {
      sp.classList.add('visible');
      renderSearchPanel();
    }
  }

  // Control del menú colapsable
  const menuTrigger = document.getElementById('menuTrigger');
  const actionDropdown = document.getElementById('actionDropdown');
  menuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menuTrigger.classList.toggle('active');
    actionDropdown.classList.toggle('show');
  });

  // Cerrar menú al hacer clic fuera (evitando duplicación de listeners)
  if (!window._menuClickRegistered) {
    document.addEventListener('click', () => {
      document.querySelectorAll('.menu-trigger-btn').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.action-menu-dropdown').forEach(el => el.classList.remove('show'));
    });
    window._menuClickRegistered = true;
  }

  // Botones
  document.getElementById('btnNew').addEventListener('click', callbacks.onNewNote);
  document.getElementById('btnOpen').addEventListener('click', callbacks.onOpenFile);
  document.getElementById('btnSave').addEventListener('click', callbacks.onSaveNote);
  document.getElementById('btnSettings').addEventListener('click', callbacks.onOpenSettings);
  document.getElementById('btnDelete').addEventListener('click', async () => {
    try {
      const { ask } = window.__TAURI__.dialog;
      const confirmed = await ask('¿Estás seguro de que deseas eliminar esta nota? Esta acción es definitiva.', {
        title: 'Eliminar nota',
        kind: 'warning',
        okLabel: 'Eliminar',
        cancelLabel: 'Cancelar'
      });
      if (confirmed) {
        await deleteNote(note.id);
        callbacks.onDeleteNote();
      }
    } catch (err) {
      console.warn('[editor] diálogo de confirmación no disponible:', err);
      const fallback = window.confirm('¿Estás seguro de que deseas eliminar esta nota? Esta acción es definitiva.');
      if (fallback) {
        await deleteNote(note.id);
        callbacks.onDeleteNote();
      }
    }
  });
}

/**
 * Auto-expande el textarea según su contenido.
 * @param {HTMLTextAreaElement} el
 */
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(el.scrollHeight, 300) + 'px';
}

/**
 * Muestra el indicador "guardado" brevemente.
 * @param {HTMLElement} el
 */
function showSaveIndicator(el) {
  el.classList.add('visible');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('visible'), 1800);
}
