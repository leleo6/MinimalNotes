/**
 * editor.js — Panel del editor principal.
 * 
 * Principio SRP: Responsable único del renderizado del editor de texto y controles de pie de página.
 * Principio DIP: Utiliza el adaptador ipc.js para confirmaciones de borrado.
 */

import { getActiveNote } from '../state.js';
import { wordCount } from '../utils.js';
import { updateNoteBody, deleteNote } from '../notes.js';
import { pushSnapshot } from '../history.js';
import { isSearchOpen, renderSearchPanel } from './search.js';
import { ask } from '../ipc.js';

export let zoomLevel = 100;

/**
 * Define el nivel de zoom y lo limita entre 80% y 200%.
 * @param {number} val 
 */
export function setZoomLevel(val) {
  zoomLevel = Math.max(80, Math.min(200, val));
}

/**
 * Incrementa o decrementa el zoom.
 * @param {number} delta 
 */
export function changeZoom(delta) {
  setZoomLevel(zoomLevel + delta);
  applyZoom();
}

/**
 * Restablece el zoom al valor inicial (100%).
 */
export function resetZoom() {
  zoomLevel = 100;
  applyZoom();
}

function applyZoom() {
  const wrap = document.querySelector('.editor-body-wrap');
  if (wrap) {
    if (zoomLevel === 100) {
      wrap.style.removeProperty('zoom');
    } else {
      wrap.style.zoom = zoomLevel + '%';
    }
  }
  const indicator = document.getElementById('zoomIndicator');
  if (indicator) {
    indicator.textContent = zoomLevel + '%';
  }
}

/**
 * Renderiza el editor basándose en si existe una nota activa.
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

  const bodyInput     = document.getElementById('bodyInput');
  const wordCountEl   = document.getElementById('wordCountEl');

  bodyInput.value = note.body ?? '';
  autoGrow(bodyInput);

  pushSnapshot(note.id, note.body);

  requestAnimationFrame(() => {
    bodyInput.focus();
    bodyInput.setSelectionRange(bodyInput.value.length, bodyInput.value.length);
  });

  attachInputHandlers(bodyInput, wordCountEl, note, callbacks);

  applyZoom();

  restoreSearchPanel();

  attachMenuHandlers();

  document.getElementById('btnNew').addEventListener('click', callbacks.onNewNote);
  document.getElementById('btnOpen').addEventListener('click', callbacks.onOpenFile);
  document.getElementById('btnSave').addEventListener('click', callbacks.onSaveNote);
  document.getElementById('btnSettings').addEventListener('click', callbacks.onOpenSettings);
  document.getElementById('btnDelete').addEventListener('click', async () => {
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
  });
}

function attachInputHandlers(bodyInput, wordCountEl, note, callbacks) {
  let snapTimer;
  
  // FIX: Unificados listeners duplicados de 'input' en un solo gestor DRY
  bodyInput.addEventListener('input', () => {
    updateNoteBody(note.id, bodyInput.value);
    wordCountEl.textContent = `${wordCount(bodyInput.value)} palabras`;
    autoGrow(bodyInput);
    callbacks.onInput();

    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      pushSnapshot(note.id, bodyInput.value);
    }, 300);
  });
}

function restoreSearchPanel() {
  if (isSearchOpen) {
    const sp = document.getElementById('searchPanel');
    if (sp) {
      sp.classList.add('visible');
      renderSearchPanel();
    }
  }
}

let _menuClickRegistered = false;

function attachMenuHandlers() {
  const menuTrigger = document.getElementById('menuTrigger');
  const actionDropdown = document.getElementById('actionDropdown');
  if (!menuTrigger || !actionDropdown) return;

  menuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menuTrigger.classList.toggle('active');
    actionDropdown.classList.toggle('show');
  });

  if (!_menuClickRegistered) {
    document.addEventListener('click', () => {
      document.querySelectorAll('.menu-trigger-btn').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.action-menu-dropdown').forEach(el => el.classList.remove('show'));
    });
    _menuClickRegistered = true;
  }
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(el.scrollHeight, 300) + 'px';
}

// FIX: Escuchar eventos 'save-status' en caliente para cambiar dinámicamente la etiqueta de guardado
if (typeof window !== 'undefined') {
  window.addEventListener('save-status', (e) => {
    const indicator = document.getElementById('saveIndicator');
    if (!indicator) return;
    if (e.detail.saving) {
      indicator.textContent = 'Guardando...';
      indicator.classList.add('visible');
      clearTimeout(indicator._hideTimer);
    } else {
      indicator.textContent = '✓ guardado';
      clearTimeout(indicator._hideTimer);
      indicator._hideTimer = setTimeout(() => {
        indicator.classList.remove('visible');
      }, 1500);
    }
  });
}
