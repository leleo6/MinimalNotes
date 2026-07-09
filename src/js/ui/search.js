/**
 * search.js — Panel de búsqueda y reemplazo.
 * 
 * Principio SRP: Responsable exclusivo de la lógica de búsqueda de texto, navegación de coincidencias y reemplazo en el editor.
 * FIX: Valida coincidencias antes del reemplazo para evitar la corrupción de texto por desincronización de índices.
 */

export let isSearchOpen = false;
let searchTerm = '';
let replaceTerm = '';
let matches = [];
let currentMatchIndex = -1;

let _bodyInputListener = null;
let _attachedBodyInput = null;
let _performSearchRef = null;

/**
 * Alterna la visibilidad del panel de búsqueda y limpia recursos si se cierra.
 */
export function toggleSearch() {
  const panel = document.getElementById('searchPanel');
  if (!panel) return;
  isSearchOpen = !isSearchOpen;
  panel.classList.toggle('visible', isSearchOpen);
  if (isSearchOpen) {
    renderSearchPanel();
  } else {
    cleanupLiveInputSync();
    _performSearchRef = null;
  }
}

/**
 * Asocia un listener al editor para mantener actualizados los conteos de búsqueda sin perturbar el foco de escritura.
 */
function setupLiveInputSync() {
  cleanupLiveInputSync();
  const bodyInput = document.getElementById('bodyInput');
  if (!bodyInput) return;

  _attachedBodyInput = bodyInput;
  _bodyInputListener = () => {
    if (isSearchOpen && searchTerm && _performSearchRef) {
      _performSearchRef(false); // Actualizar coincidencias silenciosamente sin robar selección
    }
  };
  bodyInput.addEventListener('input', _bodyInputListener);
}

/**
 * Remueve el listener del editor.
 */
function cleanupLiveInputSync() {
  if (_attachedBodyInput && _bodyInputListener) {
    _attachedBodyInput.removeEventListener('input', _bodyInputListener);
  }
  _attachedBodyInput = null;
  _bodyInputListener = null;
}

/**
 * Renderiza el panel HTML de búsqueda e inicializa eventos de control.
 */
export function renderSearchPanel() {
  const container = document.getElementById('searchPanel');
  if (!container) return;

  container.innerHTML = `
    <div class="search-panel-header">
      <span class="search-panel-title">Buscar y reemplazar</span>
      <button class="search-panel-close" id="searchCloseBtn" aria-label="Cerrar búsqueda">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="search-field">
      <input type="text" id="searchInput" class="search-input" placeholder="Buscar…" autocomplete="off" spellcheck="false">
      <span class="search-count" id="searchCount"></span>
    </div>
    <div class="search-field">
      <input type="text" id="replaceInput" class="search-input" placeholder="Reemplazar con…" autocomplete="off" spellcheck="false">
    </div>
    <div class="search-actions">
      <button class="search-btn" id="searchPrevBtn" title="Anterior (Shift+Enter)">▲</button>
      <button class="search-btn" id="searchNextBtn" title="Siguiente (Enter)">▼</button>
      <button class="search-btn search-btn--replace" id="searchReplaceBtn" title="Reemplazar">Reemplazar</button>
      <button class="search-btn search-btn--replace" id="searchReplaceAllBtn" title="Reemplazar todo">Todo</button>
    </div>
  `;

  const searchInput = document.getElementById('searchInput');
  const replaceInput = document.getElementById('replaceInput');
  const countEl = document.getElementById('searchCount');

  /**
   * Realiza la búsqueda y actualiza la lista de coincidencias.
   * @param {boolean} shouldHighlight Indica si debe seleccionarse visualmente la coincidencia activa.
   */
  function performSearch(shouldHighlight = true) {
    searchTerm = searchInput.value;
    const bodyInput = document.getElementById('bodyInput');
    if (!bodyInput || !searchTerm) {
      matches = [];
      currentMatchIndex = -1;
      countEl.textContent = '';
      return;
    }
    const text = bodyInput.value;
    const lowerText = text.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    matches = [];
    let idx = lowerText.indexOf(lowerTerm);
    while (idx !== -1) {
      matches.push(idx);
      idx = lowerText.indexOf(lowerTerm, idx + 1);
    }
    
    // Mantener índice si es factible
    if (matches.length > 0) {
      if (currentMatchIndex < 0 || currentMatchIndex >= matches.length) {
        currentMatchIndex = 0;
      }
    } else {
      currentMatchIndex = -1;
    }

    countEl.textContent = matches.length > 0 ? `${currentMatchIndex + 1} de ${matches.length}` : '0 resultados';
    if (shouldHighlight) {
      highlightMatch(bodyInput);
    }
  }

  function highlightMatch(input) {
    if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
      const pos = matches[currentMatchIndex];
      input.focus();
      input.setSelectionRange(pos, pos + searchTerm.length);
    }
  }

  function nextMatch() {
    if (matches.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % matches.length;
    countEl.textContent = `${currentMatchIndex + 1} de ${matches.length}`;
    highlightMatch(document.getElementById('bodyInput'));
  }

  function prevMatch() {
    if (matches.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    countEl.textContent = `${currentMatchIndex + 1} de ${matches.length}`;
    highlightMatch(document.getElementById('bodyInput'));
  }

  /**
   * Reemplaza la coincidencia seleccionada actual tras validar la exactitud del índice.
   */
  function doReplace() {
    if (currentMatchIndex < 0 || currentMatchIndex >= matches.length || !searchTerm) return;
    const bodyInput = document.getElementById('bodyInput');
    if (!bodyInput) return;
    
    const pos = matches[currentMatchIndex];
    const currentText = bodyInput.value;

    // FIX: Verificar de manera estricta si el texto actual coincide con el término buscado.
    // Previene la corrupción del documento si el texto fue modificado externamente (desplazando los índices).
    const actualSlice = currentText.slice(pos, pos + searchTerm.length);
    if (actualSlice.toLowerCase() !== searchTerm.toLowerCase()) {
      // Los índices están desactualizados; recalculamos la búsqueda silenciosamente y abortamos.
      performSearch(false);
      return;
    }

    replaceTerm = replaceInput.value;
    const before = currentText.slice(0, pos);
    const after = currentText.slice(pos + searchTerm.length);
    bodyInput.value = before + replaceTerm + after;
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
    performSearch(true); // Buscar de nuevo y resaltar la siguiente coincidencia
  }

  function doReplaceAll() {
    if (!searchTerm) return;
    const bodyInput = document.getElementById('bodyInput');
    if (!bodyInput) return;
    replaceTerm = replaceInput.value;
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    bodyInput.value = bodyInput.value.replace(regex, replaceTerm);
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
    performSearch(false); // Actualizar coincidencias silenciosamente
  }

  searchInput.addEventListener('input', () => performSearch(true));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) prevMatch();
      else nextMatch();
    }
    if (e.key === 'Escape') toggleSearch();
  });
  
  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) prevMatch();
      else doReplace();
    }
    if (e.key === 'Escape') toggleSearch();
  });

  document.getElementById('searchNextBtn').addEventListener('click', nextMatch);
  document.getElementById('searchPrevBtn').addEventListener('click', prevMatch);
  document.getElementById('searchReplaceBtn').addEventListener('click', doReplace);
  document.getElementById('searchReplaceAllBtn').addEventListener('click', doReplaceAll);
  document.getElementById('searchCloseBtn').addEventListener('click', toggleSearch);

  _performSearchRef = performSearch;
  setupLiveInputSync();

  if (searchTerm) {
    searchInput.value = searchTerm;
    replaceInput.value = replaceTerm;
    performSearch(true);
  }
}
