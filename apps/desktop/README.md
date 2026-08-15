# @deepseek-ai/dsh-desktop

Desktop launcher for DeepSeek Harness: a thin Electron shell that boots the
`dsh web` profile in a child process and opens the served browser GUI in a
native window.

The shell does not embed the harness. It spawns the same `dsh web` invocation a
user would run, watches its stdout for the `dsh web: http://127.0.0.1:<port>`
readiness line, and loads that URL. The harness and the window share one
lifetime: closing the window stops the harness, and a harness crash ends the
app. Cross-origin links open in the system browser; the harness's `/api`
browser-trust fence already accepts loopback, so the shell needs no extra trust
configuration.

## Requirements

- Node `^22.19 || >=24` on `PATH` (the same requirement as `dsh` itself — the
  shell spawns the harness with the system `node`).
- A built checkout: `pnpm run build` from the repository root produces the
  frontend `dist` and the `dsh` CLI bundle the harness serves and the shell
  spawns.
- Electron 28+ (the shell uses an ESM main entry; `^37.2.0` is declared).

## Usage

```sh
pnpm run build                                        # from the repository root
pnpm --filter @deepseek-ai/dsh-desktop run dev        # launch the native window
```

The window opens over the harness's loopback URL. The harness runs on an
OS-assigned port, so concurrent launches never collide on `EADDRINUSE`.

### Desktop shortcut (Windows)

A shortcut that launches the built shell (no rebuild) can be created with the
bundled script:

```powershell
pwsh -ExecutionPolicy Bypass -File apps/desktop/scripts/create-shortcut.ps1
```

It writes `DeepSeek Harness.lnk` to the Desktop, targeting `electron.exe` with
the app directory as its working directory, and uses `assets/icon.ico` (the
DeepSeek Harness logo, generated from `apps/web/public/favicon.svg`) as its
icon.

## How it works

- `src/harness.ts` owns the child process: it resolves the `@deepseek-ai/dsh`
  `lib/bin.js`, spawns `node <bin> web --port 0`, parses the readiness line, and
  provides a `stop()` that escalates SIGTERM → SIGKILL.
- `src/main.ts` owns the window: it boots the harness on `app.whenReady()`,
  opens one `BrowserWindow` over the ready URL, routes external links to the
  system browser, and stops the child before quitting.
- `tests/harness.spec.ts` pins the readiness-line parsing, the fixed argument
  list, the bin resolution, and the spawn/stop lifecycle against a fake child.

## Known Limitations and Deferred Work

- **No self-contained installer.** `electron-builder` packaging that bundles
  Node, the built `dsh`, and its dependencies into a distributable installer is
  not yet wired; the shell currently requires Node and a built checkout.
- **No tray, auto-update, or single-instance lock.** The shell is a single
  window; system-tray residency, update delivery, and second-instance handling
  are not implemented.
- **No native file dialogs.** The harness's own directory-picker rows cover
  file selection; no Electron `dialog` bridge is wired into the renderer.
