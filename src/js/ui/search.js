export let isSearchOpen = false;
let searchTerm = '';
let replaceTerm = '';
let matches = [];
let currentMatchIndex = -1;

export function toggleSearch() {
  const panel = document.getElementById('searchPanel');
  if (!panel) return;
  isSearchOpen = !isSearchOpen;
  panel.classList.toggle('visible', isSearchOpen);
  if (isSearchOpen) {
    renderSearchPanel();
  }
}

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

  function performSearch() {
    searchTerm = searchInput.value;
    const bodyInput = document.getElementById('bodyInput');
    if (!bodyInput || !searchTerm) {
      matches = [];
      currentMatchIndex = -1;
      countEl.textContent = '';
      return;
    }
    const text = bodyInput.value;
    matches = [];
    let idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    while (idx !== -1) {
      matches.push(idx);
      idx = text.toLowerCase().indexOf(searchTerm.toLowerCase(), idx + 1);
    }
    currentMatchIndex = matches.length > 0 ? 0 : -1;
    countEl.textContent = matches.length > 0 ? `${currentMatchIndex + 1} de ${matches.length}` : '0 resultados';
    highlightMatch(bodyInput);
  }

  function highlightMatch(input) {
    if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
      const pos = matches[currentMatchIndex];
      input.focus();
      input.setSelectionRange(pos, pos + searchTerm.length);
      input.scrollTop = input.scrollTop;
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

  function doReplace() {
    if (currentMatchIndex < 0 || !searchTerm) return;
    const bodyInput = document.getElementById('bodyInput');
    if (!bodyInput) return;
    const pos = matches[currentMatchIndex];
    replaceTerm = replaceInput.value;
    const before = bodyInput.value.slice(0, pos);
    const after = bodyInput.value.slice(pos + searchTerm.length);
    bodyInput.value = before + replaceTerm + after;
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
    performSearch();
  }

  function doReplaceAll() {
    if (!searchTerm) return;
    const bodyInput = document.getElementById('bodyInput');
    if (!bodyInput) return;
    replaceTerm = replaceInput.value;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    bodyInput.value = bodyInput.value.replace(regex, replaceTerm);
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
    performSearch();
  }

  searchInput.addEventListener('input', performSearch);
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

  if (searchTerm) {
    searchInput.value = searchTerm;
    replaceInput.value = replaceTerm;
    performSearch();
  }
}
