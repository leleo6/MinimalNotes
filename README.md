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

## Download

Pre-built binaries are available on the [Releases page](https://github.com/Leo-Codex/NOTES/releases).

| File | Platform | Install |
|---|---|---|
| `MinimalNotes-*.tar.gz` | **Any Linux** | `tar -xzf` and run `./minimalnotes` |
| `MinimalNotes-*.pkg.tar.zst` | **Arch Linux** | `sudo pacman -U file.pkg.tar.zst` |
| `MinimalNotes-*.msi` | **Windows** | Double-click |
| `MinimalNotes-*-setup.exe` | **Windows** | Double-click |

> **Requirements**: Linux `.tar.gz` needs `webkit2gtk-4.1` installed system-wide.

---

## Continuous Builds

Every tagged release (`git tag v0.2.0 && git push origin v0.2.0`) triggers an automated build via **GitHub Actions** with three parallel jobs:

| Job | Runner | Produces |
|---|---|---|
| `linux` | ubuntu-latest | `.tar.gz` |
| `windows` | windows-latest | `.msi` + `.exe` |
| `archlinux` | Arch Linux container | `.pkg.tar.zst` + `.tar.gz` |

All artifacts are uploaded to the corresponding [GitHub Release](https://github.com/Leo-Codex/NOTES/releases). The workflow file is at `.github/workflows/release.yml`.

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
