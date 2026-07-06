# Arquitectura de MinimalNotes

## Visión General

MinimalNotes utiliza una **arquitectura multi-proceso basada en IPC (Inter-Process Communication)**. El frontend (WebView) y el backend (Rust) están completamente aislados. Toda comunicación ocurre a través del sistema de comandos y eventos de Tauri.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROCESO PRINCIPAL (Rust)                   │
│                                                                 │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  main.rs    │  │  commands.rs     │  │  file_manager.rs   │  │
│  │  (entrada)  │──│  (comandos IPC)  │──│  (lectura/escritura │  │
│  │  plugins    │  │  open_file       │  │   de archivos)     │  │
│  │  eventos    │  │  save_file_as    │  │                   │  │
│  └─────────────┘  │  save_file       │  └────────────────────┘  │
│                   └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                            │ IPC (invoke / event)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WebView (Frontend)                         │
│                                                                 │
│  ┌──────────┐ ┌───────┐ ┌───────┐ ┌────────┐ ┌─────────────┐  │
│  │ main.js  │ │state  │ │store  │ │config  │ │ utils.js    │  │
│  │(orquest.)│ │ .js   │ │ .js   │ │ .js    │ │ (utilerías) │  │
│  └──────────┘ └───────┘ └───────┘ └────────┘ └─────────────┘  │
│  ┌──────────┐ ┌───────┐ ┌───────┐ ┌────────┐ ┌─────────────┐  │
│  │ notes.js │ │windows│ │history│ │ sync.js│ │ settings.js │  │
│  │(CRUD)    │ │ .js   │ │ .js   │ │(eventos│ │ (config.)  │  │
│  └──────────┘ └───────┘ └───────┘ │ multi- │ └─────────────┘  │
│  ┌──────────┐ ┌───────┐           │window) │ ┌─────────────┐  │
│  │ ui/      │ │ ui/   │ ┌───────┐ └────────┘ │ ui/         │  │
│  │sidebar.js│ │tabbar │ │editor │ ┌────────┐ │ search.js   │  │
│  └──────────┘ │ .js   │ │ .js   │ │ drag.js│ └─────────────┘  │
│               └───────┘ └───────┘ └────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌────────────────────────────┐
              │  Sistema de Archivos       │
              │  + Store (notes.json)      │
              └────────────────────────────┘
```

---

## Flujo de Datos

### Ciclo de vida de una nota

```
Crear nota:
  main.js → notes.createNote() → state.addNote()
    → store.saveToStore() (persiste en JSON)
    → ui/sidebar.render() + ui/tabbar.render()
    → sync.js emite evento "note-created" a otras ventanas

Editar nota:
  editor.js (input) → notes.updateNoteBody(id, body)
    → history.pushSnapshot() (undo/redo)
    → state.updateNote()
    → store.saveToStore() (debounced 500ms)
    → sync.js emite "note-updated" a otras ventanas
    → ui/tabbar.render() (actualiza excerpt)
    → ui/editor.js actualiza word count

Eliminar nota:
  editor.js (botón eliminar) → notes.deleteNote(id)
    → state.removeNote()
    → store.saveToStore()
    → sync.js emite "note-deleted"
    → ui/sidebar.render() + ui/tabbar.render()

Abrir archivo del sistema:
  editor.js (botón abrir) → notes.openFileFromSystem()
    → invoke("open_file") → Rust: dialog nativo → read_file()
    → devuelve (path, content) al frontend
    → notes.createNote() con el contenido y path
```

---

## IPC (Inter-Process Communication)

### Comandos (Rust → Frontend via `invoke`)

| Comando | Descripción | Parámetros | Retorno |
|---------|-------------|------------|---------|
| `open_file` | Abre diálogo nativo para seleccionar archivo | — | `(path: String, content: String)` |
| `save_file_as` | Abre diálogo "Guardar como" y escribe archivo | `content: String` | `(path: String)` |
| `save_file` | Guarda en ruta conocida sin diálogo | `path: String, content: String` | — |

### Eventos (Cross-window sync)

| Evento | Dirección | Propósito |
|--------|-----------|-----------|
| `note-updated` | Window → Window | Sincroniza cambios de contenido |
| `note-deleted` | Window → Window | Notifica eliminación |
| `note-created` | Window → Window | Notifica nueva nota |
| `settings-changed` | Settings → Main | Aplica configuración en caliente |
| `window-note-opened` | Window → Window | Registra nueva ventana |
| `window-note-closed` | Window → Window | Limpia ventana cerrada |

---

## Persistencia

### Store (tauri-plugin-store)

La aplicación utiliza un archivo JSON (`notes.json`) gestionado por `tauri-plugin-store` para persistir tres conjuntos de datos:

| Clave | Contenido | Frecuencia de escritura |
|-------|-----------|------------------------|
| `notes-data` | Array de notas (id, body, createdAt, updatedAt, path) | Debounced 500ms por cambio |
| `settings-data` | Configuración (tema, fuente, tamaño, etc.) | Al cambiar en settings |
| `windows-data` | Estado de ventanas (posición, tamaño, zoom) | Al mover/redimensionar |

### Archivos del sistema

MinimalNotes puede leer y escribir archivos reales del sistema a través de los comandos IPC de Rust. Extensiones soportadas: `.txt`, `.md`, `.py`, `.rs`, `.html`, `.css`, `.js`, `.ts`, `.json`, `.toml`, `.c`, `.cpp`, `.java`, `.sh`, `.yaml`, `.xml`, `.csv`, `.env`.

---

## Multi-ventana

Cada ventana se identifica con una etiqueta única (`mn-note-` + noteId). El módulo `windows.js` mantiene un `Map` de ventanas abiertas y persiste su estado geométrico. Cuando una nota se abre en su propia ventana:

1. `windows.js` crea una `WebviewWindow` con la misma URL (`index.html`) y pasa el noteId como query param
2. La nueva ventana carga `main.js`, detecta el query param y carga solo esa nota
3. Ambas ventanas se suscriben a eventos de sincronización via `sync.js`
4. Al cerrar la ventana, se emite `window-note-closed` y la ventana principal actualiza su UI

---

## Principios de Diseño

- **SRP (Responsabilidad Única)**: Cada módulo tiene una responsabilidad claramente definida
- **OCP (Abierto/Cerrado)**: Agregar temas o comandos no requiere modificar el renderizado
- **Offline-first**: Cero dependencias CDN, tipografías embebidas
- **Sin frameworks**: Vanilla JS puro para máxima velocidad y mínimo consumo
