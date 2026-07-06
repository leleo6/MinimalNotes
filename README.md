# MinimalNotes

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2-%23FFC131)](https://v2.tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021-edition-dea584)](https://www.rust-lang.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey)](https://v2.tauri.app)

**MinimalNotes** is an ultra-lightweight, offline-first plain-text editor for the desktop. It prioritizes speed, simplicity, and resource efficiency, achieving an executable size of approximately **5 MB** and a memory footprint of roughly **50 MB RAM** -- comparable to the most basic system utilities.

Built with **Tauri v2** and **Vanilla JavaScript**, MinimalNotes delivers instant startup, fluid typing, and complete offline capability without the overhead of Chromium or a JavaScript framework.

---

## Features

- **Instant Startup** -- No splash screens, no framework bootstrap. The window appears and is ready to type in under a second.
- **Native File Integration** -- Open and save plain-text files directly from the file system (`.txt`, `.md`, `.py`, `.rs`, `.html`, and more).
- **Spine Sidebar** -- A minimal dot-based navigation sidebar that collapses automatically when only a single note is active, maximizing screen space.
- **Intelligent Cache** -- Unsaved notes persist locally with a configurable retention limit (default: 10, maximum: 50). When the limit is exceeded, the oldest unsaved note is evicted automatically.
- **Live Reactivity** -- Font family, line height, maximum width, and placeholder visibility update in real time as settings are adjusted -- no restart required.
- **Three Premium Themes** -- Light, Dark, and Sepia modes, each carefully tuned for comfortable long-form writing.
- **Multi-Window Support** -- Each note can be opened in its own independent window. Changes sync in real time across all windows.
- **Undo / Redo** -- Full history stack per note (500 snapshots).
- **Search & Replace** -- In-note search and replace with a clean, minimal interface.
- **Customizable Keyboard Shortcuts** -- Every editor action is keyboard-accessible and configurable.

---

## Architecture

```
+---------------------------------------------------------------+
|  Tauri v2 (Rust Backend)                                      |
|  +--------------------------------+  +---------------------+  |
|  |  IPC Commands                  |  |  File I/O           |  |
|  |  - open_file                   |  |  - read_file()      |  |
|  |  - save_file                   |  |  - write_file()     |  |
|  |  - save_file_as                |  |                     |  |
|  +-----------------+--------------+  +---------------------+  |
|                    |                                         |
+--------------------+------------------------------------------+
                     |  Tauri IPC Bridge (JSON-RPC)
+--------------------+------------------------------------------+
|  WebView (Vanilla JS Frontend)                               |
|  +------------------+  +---------------+  +---------------+  |
|  |  Core Modules    |  |  UI Modules   |  |  Persistence  |  |
|  |  - state.js      |  |  - sidebar.js |  |  - store.js   |  |
|  |  - notes.js      |  |  - tabbar.js  |  |  (tauri-     |  |
|  |  - history.js    |  |  - editor.js  |  |   plugin-    |  |
|  |  - sync.js       |  |  - search.js  |  |   store)     |  |
|  |  - windows.js    |  |               |  |               |  |
|  +------------------+  +---------------+  +---------------+  |
+---------------------------------------------------------------+
```

The backend (Rust) handles native file access via Tauri IPC commands, while all UI rendering, state management, and business logic live in the frontend. Cross-window synchronization is handled through Tauri's event system, ensuring changes made in one window are reflected in all others in real time.

---

## Technology Stack

| Layer            | Technology                              |
|------------------|-----------------------------------------|
| Desktop Shell    | [Tauri v2](https://v2.tauri.app)        |
| Backend          | Rust (2021 edition)                     |
| Frontend         | Vanilla JavaScript (ES6+ modules)       |
| UI               | HTML5 / CSS3                            |
| Persistence      | `tauri-plugin-store` (JSON)              |
| Native Dialogs   | `tauri-plugin-dialog`                    |
| Typography       | Lora (serif) / JetBrains Mono (mono)    |

---

## Keyboard Shortcuts

| Shortcut          | Action                        |
|-------------------|-------------------------------|
| `Ctrl + N`        | Create a new note             |
| `Ctrl + O`        | Open a local file             |
| `Ctrl + S`        | Save current file             |
| `Esc`             | Close settings window         |

Additional shortcuts are configurable in the settings window.

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Rust](https://www.rust-lang.org) and Cargo 1.75 or later
- System build dependencies (Linux: `build-essential`, `webkit2gtk-4.1`, etc.; see [Tauri docs](https://v2.tauri.app/start/prerequisites/))

### Getting Started

```bash
npm install
npm run dev
```

This starts the Tauri development server with hot-reload on both the Rust and frontend sides.

### Production Build

```bash
npm run build
```

The resulting packages are placed in `src-tauri/target/release/bundle/`.

| Platform  | Output                              |
|-----------|-------------------------------------|
| Linux     | `.tar.gz` (portable)                |
| Arch      | `.pkg.tar.zst` (native package)     |
| Windows   | `.msi` + `.exe` (installer)         |

> **Note**: Build locally for the platform you're on. Arch Linux packages require Arch Linux (`makepkg`). For automated multi-platform builds, see [Continuous Builds](#continuous-builds).

---

## Cómo instalar

### 🪟 Windows

1. Ve a la [página de Releases](https://github.com/Leo-Codex/NOTES/releases)
2. Busca la última versión (la más reciente)
3. Descarga **`MinimalNotes-*-setup.exe`**
4. Haz doble clic en el archivo descargado
5. Sigue los pasos del instalador
6. ¡Listo! Busca "MinimalNotes" en el menú de inicio

### 🐧 Linux (cualquier distribución)

1. Ve a la [página de Releases](https://github.com/Leo-Codex/NOTES/releases)
2. Busca la última versión
3. Descarga **`MinimalNotes-*-x86_64-linux.tar.gz`**
4. Abre una terminal y escribe:

```bash
# Extraer el archivo
tar -xzf MinimalNotes-*-x86_64-linux.tar.gz

# Ejecutar
./minimalnotes
```

> **Requisito**: Necesitas tener instalado `webkit2gtk-4.1`. Si no lo tienes:
> - Ubuntu/Debian: `sudo apt install libwebkit2gtk-4.1-dev`
> - Fedora: `sudo dnf install webkit2gtk4.1`
> - Arch: `sudo pacman -S webkit2gtk-4.1`

### 🐧 Arch Linux (recomendado)

1. Ve a la [página de Releases](https://github.com/Leo-Codex/NOTES/releases)
2. Descarga **`MinimalNotes-*-x86_64.pkg.tar.zst`**
3. Abre una terminal y escribe:

```bash
sudo pacman -U MinimalNotes-*-x86_64.pkg.tar.zst
```

4. `pacman` instala las dependencias automáticamente
5. Busca "MinimalNotes" en el menú de aplicaciones

---

## Para desarrolladores

### Compilar desde código

```bash
npm install
npm run build
```

Los archivos compilados quedan en `src-tauri/target/release/bundle/`.

### CI/CD automático

Cada vez que se crea un tag `v*` (ej. `git tag v0.1.0 && git push origin v0.1.0`), GitHub Actions compila la app en 3 máquinas en paralelo y sube los instalables a la Release:

| Máquina | Genera |
|---|---|
| Ubuntu | `.tar.gz` + AppImage |
| Windows | `.msi` + `.exe` |
| Arch Linux (contenedor) | `.pkg.tar.zst` + `.tar.gz` |

---

## Project Structure

```
MinimalNotes/
├── src/                          # Frontend source
│   ├── index.html                # Main editor window
│   ├── settings.html             # Settings window
│   ├── css/                      # Stylesheets
│   ├── fonts/                    # Embedded WOFF2 fonts
│   └── js/                       # ES6 modules
│       ├── main.js               # Application orchestrator
│       ├── state.js              # In-memory state
│       ├── store.js              # Persistence layer
│       ├── notes.js              # Note CRUD
│       ├── history.js            # Undo/redo stacks
│       ├── sync.js               # Cross-window sync
│       ├── windows.js            # Window management
│       ├── utils.js              # Utilities
│       ├── drag.js               # Drag-to-window
│       ├── stepper.js            # Stepper UI component
│       ├── settings.js           # Settings logic
│       └── ui/                   # UI rendering modules
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri configuration
│   ├── capabilities/             # Security permissions
│   └── src/
│       ├── main.rs               # Entry point
│       ├── commands.rs           # IPC command handlers
│       └── file_manager.rs       # File I/O
├── Docs/                         # Documentation
├── package.json                  # Node.js configuration
└── LICENSE                       # MIT license
```

---

## Contributing

Contributions are welcome. Please open an issue or pull request for any feature requests, bug reports, or improvements. This project adheres to the principles of clean code and single responsibility; familiarity with Tauri v2 and Vanilla JavaScript is recommended before submitting substantial changes.

---

## License

[MIT](LICENSE) -- Copyright (c) 2026 Leo-Codex
