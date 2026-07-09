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
    ├── ipc.js              # Adaptador de comunicación con Tauri (DIP)
    ├── state.js            # Estado en memoria (DRY)
    ├── store.js            # Capa de persistencia (Singleton seguro)
    ├── config.js           # Configuración centralizada
    ├── notes.js            # Operaciones de negocio de notas
    ├── windows.js          # Gestión multi-ventana
    ├── history.js          # Deshacer/rehacer (DRY y memory-leak free)
    ├── utils.js            # Utilerías
    ├── drag.js             # Arrastrar para abrir ventana
    ├── stepper.js          # Componente stepper reutilizable
    ├── sync.js             # Sincronización entre ventanas
    ├── settings.js         # Lógica de ventana de configuración (declarativo & OCP)
    └── ui/
        ├── sidebar.js      # Barra lateral (Spine)
        ├── tabbar.js       # Barra de pestañas
        ├── editor.js       # Panel del editor (live save-status events)
        └── search.js       # Panel de buscar y reemplazar (reemplazo seguro)
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

### `ipc.js` — Adaptador de Comunicación (Dependency Inversion)

Centraliza y encapsula todas las APIs nativas de Tauri (`core.invoke`, `event.emit`, `event.listen`, diálogos y manejo de ventanas).

**Responsabilidades:**
- Servir de puente desacoplador entre el código del frontend y el entorno nativo de Tauri.
- Proporcionar mocks funcionales cuando la aplicación se ejecuta en entornos web normales (sin Tauri).
- Gestionar de forma robusta las promesas de desregistro (`unlisten`) de eventos globales y de ventana de Tauri de forma sincrónica.

**API:**
| Función | Descripción |
|---------|-------------|
| `isTauriAvailable()` | Retorna `true` si `window.__TAURI__` está presente |
| `invoke(cmd, args)` | Invoca comandos en el backend con mocks integrados |
| `emit(event, payload)` | Emite un evento global de Tauri de forma segura |
| `listen(event, callback)` | Registra listeners globales y retorna una función de desregistro síncrona |
| `ask(msg, options)` | Muestra diálogo de confirmación nativo (o fallback a `confirm`) |
| `showMessage(msg, options)` | Muestra diálogo informativo nativo (o fallback a `alert`) |
| `getCurrentWindowLabel()` | Retorna el label de la WebviewWindow actual |
| `setWindowFocus(label)` | Da foco a la ventana especificada por label |
| `createWebviewWindow(label, opts)` | Instancia una nueva ventana de navegador Tauri |
| `closeCurrentWindow()` | Cierra de manera segura la ventana actual |
| `setWindowBackgroundColor(hex)` | Cambia el fondo del WebView nativo |
| `listenToWindow(event, cb)` | Escucha eventos de ventana Tauri y retorna un desregistro síncrono |
| `getWindowPosition()` | Retorna coordenadas `{x, y}` nativas |
| `getWindowSize()` | Retorna tamaño `{width, height}` nativo |

---

### `state.js` — Estado en Memoria (DRY)

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

**Patrón Singleton Seguro:** Una única instancia de Store es expuesta de forma thread-safe inicializándose con una promesa cacheada (`_storePromise`) para evitar condiciones de carrera cuando múltiples llamadas concurrentes intentan abrir el archivo de store a la vez. Limpia la caché si la carga inicial falla para permitir reintentos.

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

### `notes.js` — Operaciones de Negocio de Notas

Operaciones de negocio y de orquestación de almacenamiento para notas.

**API:**
| Función | Descripción |
|---------|-------------|
| `createNote(body, path)` | Crea una nueva nota, aplica límite de caché y emite evento sync |
| `deleteNote(id)` | Elimina nota del estado, store, limpia historial y emite evento sync |
| `updateNoteBody(id, body)` | Actualiza contenido, despacha eventos `save-status`, y programa guardado con debounce |
| `openNewNoteWindow()` | Crea una nota nueva en memoria y la abre en una ventana independiente |
| `openFileFromSystem()` | Abre archivo del sistema via diálogo nativo usando `ipc.js` |
| `saveActiveNoteToSystem()` | Guarda nota activa a disco usando comandos de `ipc.js` |

**Límite de caché:** Al alcanzar el límite configurado (`notesLimit`), se elimina automáticamente la nota no guardada más antigua y se purga su historial para evitar memory leaks.

**Eventos de guardado (save-status):** Al modificar el cuerpo de la nota, se emite inmediatamente un evento global `save-status` con `{ saving: true }`. Al completarse el guardado diferido (debounced a 500ms), se emite `{ saving: false }`.

---

### `windows.js` — Gestión Multi-ventana

Maneja el seguimiento de ventanas abiertas y la persistencia de su geometría de forma aislada y desacoplada de la lógica de notas.

**API:**
| Función | Descripción |
|---------|-------------|
| `getOpenWindows()` | Retorna el Map de ventanas abiertas en esta sesión |
| `registerCurrentWindow(noteId, zoom)` | Registra la ventana actual y emite evento de apertura |
| `openNoteWindow(noteId)` | Abre una nota existente en una ventana independiente |
| `saveWindowState(label, noteId, zoom)` | Guarda las coordenadas geométricas y zoom en el store |
| `setupWindowStatePersistence(label, noteId)` | Monitorea eventos de resize/move y beforeunload para persistir geometría |
| `loadSavedWindowStates()` | Retorna la lista de geometrías de ventana guardadas |

**Geometría y Zoom:** Al mover o redimensionar la ventana, se ejecuta un guardado diferido de su posición. Si no se provee el zoom en el guardado, se recupera de manera segura el zoom activo desde el mapa de memoria `openWindows`.

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
- Cargar configuración inicial desde query params con sanitización y fallbacks por defecto
- Renderizar controles: steppers, selects, inputs, checkboxes
- Vincular de manera declarativa los controles de formulario usando el mapeo `CONFIG_FIELDS` (OCP)
- Implementar grabación interactiva de atajos de teclado con validación de teclas modificadoras
- Emitir evento `settings-changed` al cambiar cualquier valor y guardarlo en el store a través de `ipc.js`
- Botón "Aplicar" cierra la ventana
- Botón "Restablecer" vuelve a valores por defecto y restablece sincronizadamente el estado interno de las instancias de stepper (evitando saltos de valor)

**Grabación de atajos:** Al hacer clic en un botón de atajo, entra en modo "grabación" con animación pulse. Al presionar la combinación deseada, se captura y muestra. Si se presiona `Escape`, se cancela la grabación sin alterar el atajo anterior.

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

Renderiza el área de edición principal y coordina los eventos de escritura del usuario.

**Estados:**
- **Vacío**: Sin nota activa — muestra icono de párrafo y botones de acción para crear o abrir archivos.
- **Activo**: textarea con menú de acciones, footer con word count, zoom indicator, indicador de guardado y botón de configuración.

**Responsabilidades:**
- Manejar input del textarea unificadamente (con auto-grow y registro diferido en el historial)
- Zoom ajustable (propiedad CSS `zoom` en el contenedor del editor)
- Actualizar word count en tiempo real
- Integrar historial de undo/redo (Ctrl+Z / Ctrl+Y)
- Manejar atajos del menú de acciones
- Integrar panel de búsqueda
- Confirmación nativa de eliminación delegada a `ipc.js` (con fallback dinámico a `window.confirm`)
- Monitorear eventos `'save-status'` a nivel de módulo para alternar de forma reactiva el estado `"Guardando..."` y `"✓ guardado"` con fade-out automático.

### `ui/search.js` — Buscar y Reemplazar

Panel de búsqueda y reemplazo dentro de la nota activa.

**Funcionalidad:**
- Búsqueda case-insensitive en tiempo real.
- Enter/Shift+Enter para navegar entre las coincidencias de manera interactiva.
- Reemplazo unitario seguro: Verifica de forma estricta que el texto en la posición coincida con el término original antes de alterar el documento (evitando la corrupción si el texto cambió externamente).
- Reemplazo global ("Todo") usando expresiones regulares dinámicas.
- Sincronización en vivo sin robar el foco de escritura: Actualiza el conteo de resultados en tiempo real cuando el usuario escribe en el editor, y remueve el listener completamente al ocultar el panel para evitar fugas de memoria.
- Toggle con `Ctrl+H`.

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
