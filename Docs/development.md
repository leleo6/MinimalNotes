# Guía de Desarrollo

## Requisitos Previos

### Node.js
```bash
node --version   # v18+
npm --version
```

### Rust y Cargo
```bash
rustc --version   # v1.75+
cargo --version
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install build-essential libwebkit2gtk-4.1-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
  libssl-dev libayatana-appindicator3-dev
```

### macOS
Xcode Command Line Tools:
```bash
xcode-select --install
```

### Windows
- WebView2 Runtime (incluido en Windows 11)
- Visual Studio Build Tools (MSVC)
- Instalar desde: https://visualstudio.microsoft.com/visual-cpp-build-tools/

---

## Setup del Proyecto

```bash
# Clonar repositorio
git clone <repo-url>
cd NOTES

# Instalar dependencias Node.js
npm install
```

Esto instalará:
- `@tauri-apps/api` ^2 — API frontend de Tauri
- `@tauri-apps/plugin-store` ^2 — Persistencia
- `@tauri-apps/plugin-dialog` ^2 — Diálogos nativos
- `@tauri-apps/cli` ^2 (dev) — CLI de Tauri

---

## Desarrollo

### Ejecutar en modo desarrollo
```bash
npm run dev
# o: npx tauri dev
```

Esto compilará el backend Rust y abrirá la aplicación en una ventana nativa con hot-reload del frontend. Los cambios en archivos HTML/CSS/JS se reflejan inmediatamente. Los cambios en Rust requieren recompilación automática.

### Compilar para producción
```bash
npm run build
# o: npx tauri build
```

Genera binarios optimizados en `src-tauri/target/release/bundle/`.

**Formatos generados:**
| Plataforma | Formatos |
|------------|----------|
| Linux | `.deb`, `.rpm`, `.AppImage` |
| Windows | `.msi`, `.exe` |
| macOS | `.dmg` |

---

## Estructura del Proyecto

```
NOTES/
├── package.json              # Config npm y scripts
├── src/                      # Frontend (WebView)
│   ├── index.html            # Ventana principal
│   ├── settings.html         # Ventana de configuración
│   ├── css/                  # Estilos
│   ├── js/                   # Módulos JavaScript
│   │   ├── main.js           # Orquestador
│   │   ├── state.js          # Estado en memoria
│   │   ├── store.js          # Persistencia
│   │   ├── config.js         # Configuración
│   │   ├── notes.js          # CRUD de notas
│   │   ├── windows.js        # Multi-ventana
│   │   ├── history.js        # Undo/redo
│   │   ├── utils.js          # Utilerías
│   │   ├── drag.js           # Drag para abrir ventana
│   │   ├── stepper.js        # Componente stepper
│   │   ├── sync.js           # Sincronización cross-window
│   │   ├── settings.js       # Configuración UI
│   │   └── ui/               # Componentes UI
│   │       ├── sidebar.js
│   │       ├── tabbar.js
│   │       ├── editor.js
│   │       └── search.js
│   └── fonts/                # Tipografías WOFF2
├── src-tauri/                # Backend (Rust)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   └── src/
│       ├── main.rs
│       ├── commands.rs
│       └── file_manager.rs
└── Docs/                     # Documentación
    ├── index.md
    ├── architecture.md
    ├── frontend-modules.md
    ├── rust-backend.md
    ├── user-guide.md
    └── development.md
```

---

## Convenciones de Código

### JavaScript
- ES Modules (import/export)
- `camelCase` para variables y funciones
- `CONSTANT_CASE` para constantes
- Funciones autodescriptivas (no añadir comentarios superfluos)
- Patrón Singleton para store

### Rust
- `snake_case` para funciones y variables
- `PascalCase` para tipos y structs
- `Result<T, String>` para manejo de errores (errores human-readable)
- `async` para comandos IPC

### CSS
- CSS Custom Properties para temas
- `kebab-case` para clases
- Sin prefijos de vendor (Tauri usa WebView2 moderno)

---

## Perfil de Release

El perfil de release en `Cargo.toml` está optimizado para tamaño mínimo:

```toml
[profile.release]
panic = "abort"          # Elimina unwinding (ahorra ~200KB)
codegen-units = 1        # Optimización maximalista
lto = true               # Link-time optimization
opt-level = "s"          # Optimizar por tamaño binario
strip = true             # Eliminar símbolos de debug
```

Esto produce un ejecutable de aproximadamente **5MB**.

---

## Agregar un Nuevo Comando IPC

1. **Rust** (`src-tauri/src/commands.rs`):
   ```rust
   #[tauri::command]
   async fn mi_comando(param: String) -> Result<String, String> {
       // lógica
       Ok("resultado".to_string())
   }
   ```

2. **Registrar** (`src-tauri/src/main.rs`):
   ```rust
   .invoke_handler(tauri::generate_handler![mi_comando])
   ```

3. **Frontend**:
   ```javascript
   const resultado = await window.__TAURI__.core.invoke('mi_comando', {
     param: 'valor'
   });
   ```

---

## Agregar un Nuevo Tema

1. **CSS** (`src/css/styles.css`): Agregar variables en un nuevo bloque:
   ```css
   body[data-theme="nuevo-tema"] {
     --bg-primary: ...;
     --text-primary: ...;
     /* etc */
   }
   ```

2. **Config** (`src/js/config.js`): Agregar a `CONFIG_DEFAULTS.theme` y `THEME_BG`

3. **Settings** (`src/settings.html`): Agregar opción en el select de temas

---

## npm Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia entorno de desarrollo |
| `npm run build` | Compila para producción |
| `npm run tauri` | Ejecuta CLI de Tauri directamente |

---

## Compilación Cruzada para Windows desde Linux

```bash
# Agregar target
rustup target add x86_64-pc-windows-msvc

# Instalar xwin
cargo install cargo-xwin

# Compilar
npm run build -- --target x86_64-pc-windows-msvc
```

---

## CI/CD con GitHub Actions

Puedes usar `tauri-apps/tauri-action` para compilar automáticamente para Windows, Linux y macOS en cada release:

```yaml
- name: Build Tauri App
  uses: tauri-apps/tauri-action@v0
  with:
    args: --target ${{ matrix.target }}
```

---

## Contribución

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza cambios siguiendo las convenciones de código
4. Verifica que la compilación no tenga errores (`npm run build`)
5. Crea un Pull Request

### Reportar Issues
Reporta bugs y solicita features en el repositorio oficial.

---

## Licencia

MIT License — Copyright (c) 2026 Leo-Codex
