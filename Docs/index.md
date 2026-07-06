# MinimalNotes — Documentación

Bienvenido a la documentación de **MinimalNotes**, un editor de texto plano minimalista, offline-first y ultra-ligero para escritorio, construido con **Tauri v2** y **Vanilla JavaScript**.

---

## Contenido

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](architecture.md) | Arquitectura del proyecto, flujo de datos, IPC y organización de directorios |
| [Módulos del Frontend](frontend-modules.md) | Referencia detallada de cada módulo JavaScript, CSS y HTML |
| [Backend Rust](rust-backend.md) | Comandos IPC, gestor de archivos y configuración Tauri |
| [Guía de Usuario](user-guide.md) | Manual de uso: atajos, temas, configuración y funciones |
| [Guía de Desarrollo](development.md) | Setup, compilación, empaquetado y contribución |
| [Requerimientos Técnicos](requerimientos.md) | Stack tecnológico y especificaciones originales |

---

## Visión General

MinimalNotes es un bloc de notas de escritorio que compite con el Bloc de Notas de Windows en velocidad y consumo de recursos (~50MB RAM, ejecutable ~5MB), ofreciendo:

- **Multi-ventana**: cada nota puede abrirse en su propia ventana independiente
- **Sincronización en tiempo real**: cambios en una ventana se reflejan en todas
- **Temas premium**: Claro, Oscuro y Sepia
- **Sin dependencias externas**: tipografías embebidas, cero CDN, offline-first
- **Apertura y guardado de archivos reales**: `.txt`, `.md`, `.py`, `.rs`, `.html`, etc.
- **Historial de deshacer/rehacer** por nota (500 snapshots)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Contenedor Desktop | Tauri v2 (Rust + WebView2) |
| Frontend | Vanilla JS (ES6+), HTML5, CSS3 puro |
| Backend | Rust 2021 edition |
| Persistencia | tauri-plugin-store (JSON) |
| Diálogos nativos | tauri-plugin-dialog |
| Tipografías | Lora + JetBrains Mono (WOFF2 embebidas) |
