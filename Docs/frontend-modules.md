# Módulos del Frontend

## Estructura de Archivos

```
src/
├── index.html              # Ventana principal del editor
├── settings.html           # Ventana de configuración
├── css/
│   ├── styles.css          # Estilos principales (~600 líneas)
│   └── settings.css        # Estilos de configuración (~360 líneas)
├── fonts/                  # Tipografías WOFF2 embebidas
│   ├── JetBrainsMono-Regular.woff2
│   ├── JetBrainsMono-Medium.woff2
│   ├── Lora-Regular.woff2
│   ├── Lora-Italic.woff2
│   └── Lora-SemiBold.woff2
└── js/
    ├── main.js             # Orquestador principal
    ├── state.js            # Estado en memoria
    ├── store.js            # Capa de persistencia
    ├── config.js           # Configuración centralizada
    ├── notes.js            # CRUD de notas
    ├── windows.js          # Gestión multi-ventana
    ├── history.js          # Deshacer/rehacer
    ├── utils.js            # Utilerías
    ├── drag.js             # Arrastrar para abrir ventana
    ├── stepper.js          # Componente stepper reutilizable
    ├── sync.js             # Sincronización entre ventanas
    ├── settings.js         # Lógica de ventana de configuración
    └── ui/
        ├── sidebar.js      # Barra lateral (Spine)
        ├── tabbar.js       # Barra de pestañas
        ├── editor.js       # Panel del editor
        └── search.js       # Panel de buscar y reemplazar
```

---

## Módulos Principales

### `main.js` — Orquestador

Punto de entrada de la aplicación. Se ejecuta al cargar `index.html`.

**Responsabilidades:**
- Inicializar la aplicación tras `DOMContentLoaded`
- Cargar configuración desde store y aplicarla al DOM
- Cargar notas guardadas (desde store o desde query params en multi-ventana)
- Registrar la ventana actual en el sistema de ventanas
- Configurar persistencia de estado de ventana (posición, tamaño, zoom)
- Escuchar eventos de sincronización cross-window
- Registrar atajos de teclado globales
- Orquestar la renderización inicial (sidebar, tabbar, editor)

**Flujo de arranque:**
```
1. loadConfig()          → store.loadSettingsFromStore()
2. applyConfigToDOM()    → aplicar tema, fuente, tamaño
3. loadNotes()           → store.loadFromStore() o query params
4. windows.register()    → registrar esta ventana
5. setupWindowState()    → restaurar/capturar geometría
6. setupSyncListeners()  → escuchar eventos cross-window
7. setupShortcuts()      → Ctrl+N, Ctrl+O, Ctrl+S, Esc
8. renderSidebar()       → ui/sidebar.js
9. renderTabbar()        → ui/tabbar.js
10. renderEditor()       → ui/editor.js
```

---

### `state.js` — Estado en Memoria

Mantiene el estado reactivo de la aplicación.

**Estructura de datos:**
```javascript
state = {
  notes: [
    {
      id: string,           // ID único (timestamp + random)
      body: string,         // Contenido de la nota
      path: string | null,  // Ruta en disco (null si no guardada)
      createdAt: number,    // Timestamp de creación
      updatedAt: number     // Timestamp de última modificación
    }
  ],
  activeId: string | null   // ID de la nota activa
}
```

**API:**
| Función | Descripción |
|---------|-------------|
| `getNotes()` | Retorna array de notas |
| `getActiveNote()` | Retorna la nota activa o null |
| `getActiveId()` | Retorna el ID activo |
| `setNotes(notes)` | Reemplaza todas las notas |
| `setActiveId(id)` | Establece nota activa |
| `addNote(note)` | Agrega una nota |
| `removeNote(id)` | Elimina una nota por ID |
| `updateNote(id, updates)` | Actualiza campos de una nota |
| `sortByUpdated()` | Ordena notas por `updatedAt` descendente |

---

### `store.js` — Persistencia (Singleton)

Capa única de persistencia mediante `tauri-plugin-store`.

**API:**
| Función | Descripción |
|---------|-------------|
| `loadFromStore()` | Carga todas las notas desde `notes.json` |
| `saveToStore(notes)` | Guarda notas en store |
| `loadSettingsFromStore()` | Carga configuración |
| `saveSettingsToStore(settings)` | Guarda configuración |
| `loadWindowStates()` | Carga estados de ventanas |
| `saveWindowStates(states)` | Guarda estados de ventanas |

**Patrón Singleton:** Una única instancia de Store es creada al inicio para evitar condiciones de carrera.

---

### `config.js` — Configuración Centralizada

Define valores por defecto y aplica configuración al DOM.

**Valores por defecto:**
| Propiedad | Default | Descripción |
|-----------|---------|-------------|
| `theme` | `'light'` | Tema visual (`light`, `dark`, `sepia`) |
| `fontSize` | `16` | Tamaño de fuente en píxeles |
| `lineHeight` | `1.8` | Interlineado |
| `fontFamily` | `'system'` | Familia tipográfica |
| `maxWidth` | `'100%'` | Ancho máximo del editor |
| `placeholder` | `'Comienza a escribir...'` | Placeholder del textarea |
| `showTabbar` | `true` | Mostrar barra de pestañas |
| `showScrollbar` | `'auto'` | Mostrar scrollbar (`auto`, `always`, `hidden`) |
| `autoSave` | `false` | Auto-guardado al escribir |
| `notesLimit` | `10` | Límite de notas en caché |

**API:**
| Exportación | Descripción |
|-------------|-------------|
| `CONFIG_DEFAULTS` | Objeto con valores por defecto |
| `FONT_MAP` | Mapeo de nombres a valores CSS (`system`, `serif`, `mono`) |
| `THEME_BG` | Colores de fondo por tema |
| `getDefaultShortcuts()` | Retorna atajos de teclado por defecto |
| `applyConfigToDOM(config)` | Aplica configuración al DOM en caliente |

---

### `notes.js` — CRUD de Notas

Operaciones de negocio sobre notas.

**API:**
| Función | Descripción |
|---------|-------------|
| `createNote(body, path)` | Crea una nueva nota, aplica límite de caché |
| `deleteNote(id)` | Elimina nota del estado y store |
| `updateNoteBody(id, body)` | Actualiza contenido con debounce y auto-save |
| `openFileFromSystem()` | Abre archivo del sistema via diálogo nativo |
| `saveActiveNoteToSystem()` | Guarda nota activa a disco |

**Límite de caché:** Al alcanzar el límite configurado (`notesLimit`), se elimina automáticamente la nota no guardada más antigua.

**Debounce:** `updateNoteBody` usa debounce de 500ms para evitar escrituras frecuentes al store.

---

### `windows.js` — Gestión Multi-ventana

Maneja la creación, seguimiento y sincronización de ventanas.

**API:**
| Función | Descripción |
|---------|-------------|
| `getWindows()` | Retorna el Map de ventanas abiertas |
| `register()` | Registra la ventana actual en el sistema |
| `openNoteWindow(noteId)` | Abre una nota en ventana independiente |
| `openNewNoteWindow()` | Crea una nota nueva en ventana nueva |
| `setupWindowState(window)` | Persigue geometría de ventana |
| `restoreWindowState(window)` | Restaura geometría guardada |

**Etiquetado de ventanas:** Cada ventana recibe una label única `mn-note-` + noteId.

---

### `history.js` — Deshacer/Rehacer

Mantiene pilas de historial independientes por nota.

**API:**
| Función | Descripción |
|---------|-------------|
| `pushSnapshot(noteId, body)` | Registra un snapshot en el historial |
| `undo(noteId)` | Retrocede un paso (retorna body anterior) |
| `redo(noteId)` | Avanza un paso (retorna body siguiente) |
| `clearHistory(noteId)` | Limpia el historial de una nota |
| `hasUndo(noteId)` | Verifica si hay acciones para deshacer |
| `hasRedo(noteId)` | Verifica si hay acciones para rehacer |

**Límite:** 500 snapshots por nota. Al excederse, se elimina el más antiguo.

---

### `utils.js` — Utilerías

Funciones auxiliares genéricas.

**API:**
| Función | Descripción |
|---------|-------------|
| `uid()` | Genera ID único (timestamp + random) |
| `clamp(value, min, max)` | Restringe valor a un rango |
| `getQueryParams()` | Parsea query params de la URL |
| `relativeTime(timestamp)` | Retorna tiempo relativo humano ("hace 2 min") |
| `wordCount(text)` | Cuenta palabras en un texto |
| `escapeHtml(text)` | Escapa caracteres HTML |
| `excerpt(text, maxLen)` | Trunca texto a longitud máxima |
| `debounce(fn, delay)` | Retorna función con debounce |
| `showTemporalIndicator(parent, text)` | Muestra indicador temporal con fade-out |

---

### `drag.js` — Arrastrar para Abrir Ventana

Permite arrastrar elementos (dots del sidebar, tabs) fuera de la ventana para abrirlos en ventana independiente.

**API:**
| Función | Descripción |
|---------|-------------|
| `setupDragToOpen(el, noteId, isOutsideFn)` | Habilita drag en un elemento |

**Funcionamiento:** Monitorea eventos `pointerdown`, `pointermove`, `pointerup`. Si el puntero sale del área permitida, se dispara `openNoteWindow()`. Incluye feedback visual (opacidad reducida durante arrastre).

---

### `stepper.js` — Componente Stepper

Componente UI reutilizable para controles incrementales (tamaño de fuente, interlineado, límite de notas).

**API:**
| Exportación | Descripción |
|-------------|-------------|
| `createStepper(options)` | Crea un stepper con botones +/-, display, y callback |

**Options:**
```javascript
{
  decId: string,       // ID del botón decrementar
  incId: string,       // ID del botón incrementar
  valueId: string,     // ID del elemento display
  min: number,         // Valor mínimo
  max: number,         // Valor máximo
  step: number,        // Incremento
  parse: fn,           // Parseador (e.g., parseInt)
  format: fn,          // Formateador (e.g., n => n + 'px')
  onChange: fn(value)  // Callback al cambiar
}
```

---

### `sync.js` — Sincronización Cross-window

Mantiene todas las ventanas sincronizadas mediante eventos de Tauri.

**Eventos escuchados:**
| Evento | Acción |
|--------|--------|
| `note-updated` | Actualiza nota en estado local y re-renderiza si es la activa |
| `note-deleted` | Elimina nota del estado local |
| `note-created` | Agrega nota al estado local |
| `window-note-opened` | Registra ventana en el Map local |
| `window-note-closed` | Elimina ventana del Map local |

---

### `settings.js` — Ventana de Configuración

Lógica de la ventana `settings.html`.

**Responsabilidades:**
- Cargar configuración inicial desde query params
- Renderizar controles: steppers, selects, inputs, checkboxes
- Implementar grabación interactiva de atajos de teclado
- Emitir evento `settings-changed` al cambiar cualquier valor
- Persistir configuración en store
- Botón "Aplicar" cierra la ventana
- Botón "Restablecer" vuelve a valores por defecto

**Grabación de atajos:** Al hacer clic en un botón de atajo, entra en modo "grabación" con animación pulse. Al presionar la combinación deseada, se captura y muestra.

---

## UI Modules

### `ui/sidebar.js` — Spine Sidebar

Renderiza la barra lateral de navegación con dots.

**Comportamiento:**
- Un dot por nota, resaltado cuando está activo
- Se oculta automáticamente si hay solo una nota
- Dots son arrastrables (vía `drag.js`) para abrir en ventana
- Al hacer clic en un dot, activa esa nota

### `ui/tabbar.js` — Barra de Pestañas

Renderiza pestañas en la parte superior del editor.

**Comportamiento:**
- Muestra excerpt del cuerpo de la nota
- Botón X para cerrar (no elimina, solo oculta si está en ventana principal)
- Doble clic abre la nota en ventana independiente
- Arrastrable para abrir ventana
- Se oculta si `showTabbar = false` o hay solo una nota

### `ui/editor.js` — Panel del Editor

Renderiza el área de edición principal.

**Estados:**
- **Vacío**: Sin nota activa — muestra icono de párrafo y botones de acción
- **Activo**: textarea con menú de acciones, footer con word count, zoom indicator, indicador de guardado, y botón de configuración

**Responsabilidades:**
- Manejar input del textarea (con auto-grow)
- Zoom (propiedad CSS `zoom`)
- Actualizar word count en tiempo real
- Integrar historial de undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Manejar atajos del menú de acciones
- Integrar panel de búsqueda

### `ui/search.js` — Buscar y Reemplazar

Panel de búsqueda dentro del editor.

**Funcionalidad:**
- Búsqueda case-insensitive
- Enter/Shift+Enter para ciclar entre resultados
- Reemplazar (uno) y Reemplazar todos
- Toggle con `Ctrl+H`

---

## CSS

### `styles.css` (~600 líneas)

- **Design tokens**: CSS custom properties para 3 temas
- **@font-face**: Lora + JetBrains Mono embebidas
- **Scrollbar styling**: Personalizada por tema
- **Layout**: Flexbox, sidebar fija, editor flexible
- **Componentes**: Sidebar dots, tabbar, search panel, editor pane, textarea, footer bar, action menu, zoom indicator, save indicator
- **Animaciones**: fadeIn, float

### `settings.css` (~360 líneas)

- Mismo sistema de temas y fuentes
- Layout de settings: header, secciones, rows
- Stepper buttons con diseño coherente
- Select, input, checkbox estilizados
- Shortcut key recorders con animación pulse
- Toast notifications
