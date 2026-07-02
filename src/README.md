# MinimalNotes 📝

Un editor de texto plano minimalista, **offline-first** y ultra-ligero para el escritorio. Desarrollado con **Tauri v2** y **Vanilla JS**, logrando un consumo de recursos ínfimo (~50MB RAM) y un ejecutable final de apenas **5MB** (sin el peso de Chromium).

---

## 🎨 Características Principales

- 🚀 **Ultra-rápido**: Carga instantánea y escritura fluida sin lags de frameworks pesados.
- 📂 **Integración con el Sistema**: Abre y guarda archivos locales directamente (`.txt`, `.md`, `.py`, `.rs`, `.html`, etc.).
- 👁️ **Spine Sidebar**: Una barra lateral de navegación minimalista basada en puntos indicadores que se oculta automáticamente cuando tienes 1 sola nota activa.
- 📦 **Caché Inteligente**: Las notas sin guardar en el disco se quedan seguras en caché local con un límite automático configurable (por defecto 10, expandible a 50). Al superarse, se elimina la nota no guardada más antigua.
- ⚡ **Reactividad en Tiempo Real**: Configura tipografías, interlineado, anchos máximos y placeholders, y observa cómo cambian en caliente mientras modificas las opciones en la ventana de configuración.
- 🍂 **Temas de Escritura Premium**:
  - **Modo Claro ☀️**: Papel suave y tinta oscura.
  - **Modo Oscuro 🌙**: Tonos tierra cálidos y profundos (descanso visual absoluto).
  - **Modo Sepia 🍂**: Apariencia de papel antiguo para lecturas prolongadas.

---

## 🎹 Atajos de Teclado Globales

| Atajo | Acción |
|---|---|
| `Ctrl + N` | Crear una nota nueva |
| `Ctrl + O` | Abrir archivo local del sistema |
| `Ctrl + S` | Guardar cambios en el archivo físico actual (o abre "Guardar como" si es nuevo) |
| `Esc` | Cerrar ventana de configuración |

---

## 🛠️ Desarrollo e Instalación

### Requisitos previos
- **Node.js** (v18+)
- **Rust** y **Cargo** (v1.75+)
- Herramientas de compilación del sistema (en Linux: `build-essential`, `webkit2gtk-4.1`, etc.).

### Ejecución en Desarrollo
Instala las dependencias de Node e inicia el servidor en caliente:

```bash
npm install
npm run dev
```

### Compilar para Producción (Linux)
Genera el binario optimizado y los instaladores nativos (`.deb` y `.rpm`):

```bash
npm run build
```

Los instaladores resultantes se guardarán en `src-tauri/target/release/bundle/`.

---

## 🪟 Compilación para Windows y Otros Sistemas

Tauri es multiplataforma por naturaleza. Para obtener el ejecutable final para Windows (`.exe` o instalador `.msi`):

### Opción 1: Compilar nativamente en Windows (Recomendado)
Dado que compilar binarios de Windows requiere el linker de Microsoft (MSVC), el método más directo es clonar el repositorio en una máquina con Windows y ejecutar:

```powershell
# Instalar dependencias e iniciar compilación
npm install
npm run build
```
Esto generará un instalador `.msi` y un `.exe` súper optimizado de aproximadamente **`4.0 MB`**.

### Opción 2: Compilación Cruzada (Cross-Compilation desde Linux)
Si quieres compilar para Windows desde Linux sin cambiar de máquina, puedes configurar `cargo-xwin`:

1. Instala el target de Windows en Rust:
   ```bash
   rustup target add x86_64-pc-windows-msvc
   ```
2. Instala la herramienta de enlazado `xwin`:
   ```bash
   cargo install cargo-xwin
   ```
3. Compila especificando el target:
   ```bash
   npm run build -- --target x86_64-pc-windows-msvc
   ```

### Opción 3: Automatización con GitHub Actions (Recomendado para distribuciones)
Puedes configurar una acción de GitHub (utilizando la oficial de Tauri: `tauri-apps/tauri-action`) para que compile automáticamente para **Windows, Linux y macOS** en la nube cada vez que hagas un commit o crees una versión.

---

## 🏗️ Arquitectura de Código (Principios S.O.L.I.D. & Clean Code)

- **Principio de Responsabilidad Única (SRP)**:
  - `store.js`: Único módulo a cargo de leer/escribir persistencia con un patrón Singleton.
  - `state.js`: Mantiene el estado en memoria de la aplicación.
  - `file_manager.rs` (Rust): Escribe y lee archivos del disco de forma pura.
- **Principio Abierto/Cerrado (OCP)**: 
  - Agregar nuevos comandos IPC o temas no requiere alterar la lógica de renderizado principal del editor.
- **Cero CDNs / Offline-first**: Tipografías y librerías embebidas en local para que la app funcione siempre sin conexión a internet.
