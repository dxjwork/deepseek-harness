/**
 * Electron main entry for the desktop shell. It boots the harness as a child
 * process, waits for the readiness line, then opens one native window over the
 * served GUI. The harness and the window share one lifetime: a window close or
 * a harness crash ends the app, and quitting stops the child first.
 * @module @deepseek-ai/dsh-desktop/main
 */

import { app, BrowserWindow, dialog, shell } from 'electron'
import { resolveDshBin, startHarness, type HarnessHandle } from './harness.ts'

/** The running harness, undefined before boot resolves or after a failure. */
let harness: HarnessHandle | undefined

/** True once quitting has begun, so the stop-and-quit path cannot re-enter. */
let quitting = false

/**
 * Whether two URLs share an origin, for routing external links out of the app.
 * @param a - one absolute URL.
 * @param b - another absolute URL.
 * @returns true when both parse to the same origin.
 */
function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin
  } catch {
    return false
  }
}

/**
 * Create the native window over the ready harness URL. In-app popups stay in
 * the window; every cross-origin target opens in the system browser.
 * @param harnessUrl - the loopback URL the harness printed as ready.
 * @returns the created window.
 */
function createWindow(harnessUrl: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'DeepSeek Harness',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.once('ready-to-show', () => { window.show() })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (sameOrigin(url, harnessUrl)) return { action: 'allow' }
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (sameOrigin(url, harnessUrl)) return
    event.preventDefault()
    void shell.openExternal(url)
  })
  void window.loadURL(harnessUrl)
  return window
}

/** Boot the harness, then open the window; rejects on any startup failure. */
async function boot(): Promise<void> {
  const handle = await startHarness({ nodeExecutable: 'node', dshBin: resolveDshBin(import.meta.url) })
  harness = handle
  // A harness that dies on its own leaves the GUI without a backend: end the app.
  void handle.exited.then(() => { if (!quitting) app.quit() })
  createWindow(handle.url)
}

/** Report a startup failure and exit, showing the reason in a native dialog. */
function failStartup(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  dialog.showErrorBox('DeepSeek Harness failed to start', message)
  app.quit()
}

void app.whenReady().then(
  async () => {
    try {
      await boot()
    } catch (error) {
      failStartup(error)
    }
  },
  (error: unknown) => { failStartup(error) },
)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', (event) => {
  if (quitting) return
  event.preventDefault()
  quitting = true
  void (harness === undefined ? Promise.resolve() : harness.stop()).finally(() => { app.quit() })
})
