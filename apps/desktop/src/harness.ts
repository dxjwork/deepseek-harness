/**
 * Child-process harness management for the desktop shell. The shell does not
 * embed the harness: it spawns the same `dsh web` invocation a user would run,
 * then treats the readiness line that invocation prints as the signal to open
 * a window (the line is the web app's documented supervisor signal).
 * @module @deepseek-ai/dsh-desktop/harness
 */

import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/** The dsh subcommand that serves the browser GUI. */
const HARNESS_MODE = 'web'

/** The loopback readiness line the harness prints once its server binds. */
const READY_URL_PATTERN = /^dsh web: (http:\/\/127\.0\.0\.1:\d+)/

/** Grace allowed for the harness to exit after SIGTERM before it is killed. */
const STOP_GRACE_MS = 3_000

/** Ceiling on waiting for the readiness line before a start is failed. */
const READY_TIMEOUT_MS = 30_000

/** How a harness child ended, mirrored from Node's exit event. */
export interface HarnessExit {
  /** Process exit code, `null` when the process was killed by a signal. */
  code: number | null
  /** Terminating signal name, `null` when the process exited on its own. */
  signal: NodeJS.Signals | null
}

/** Options for {@link startHarness}. */
export interface HarnessOptions {
  /** Node executable that runs the harness (typically `'node'` on PATH). */
  nodeExecutable: string
  /** Absolute path to the dsh CLI bundle (`lib/bin.js`). */
  dshBin: string
  /** Arguments passed to dsh after the script path; defaults to {@link buildHarnessArgs}. */
  args?: readonly string[]
  /** Environment entries merged over `process.env` for the child. */
  env?: Readonly<Record<string, string>>
  /** Receives each stdout line after readiness scanning; defaults to `process.stdout`. */
  onOutput?: (line: string) => void
  /** Receives each stderr chunk; defaults to `process.stderr`. */
  onError?: (chunk: string) => void
}

/** A running harness child: its ready URL, its exit fact, and its stop control. */
export interface HarnessHandle {
  /** Loopback URL the harness printed as ready. */
  url: string
  /** Settles when the child has exited. */
  exited: Promise<HarnessExit>
  /** Stop the harness (SIGTERM, grace, then SIGKILL); resolves once exited. */
  stop(): Promise<void>
}

/**
 * The dsh invocation the shell uses: the web profile on an OS-assigned port.
 * A free port keeps the shell from failing on `EADDRINUSE`; the readiness line
 * reports the real port, so the shell never needs to pick one.
 * @returns the fixed harness argument list.
 */
export function buildHarnessArgs(): readonly string[] {
  return [HARNESS_MODE, '--port', '0']
}

/**
 * Extract the loopback URL from a harness stdout line.
 * @param line - one line of the harness stdout.
 * @returns the `http://127.0.0.1:<port>` URL, or `undefined` when the line is not the readiness line.
 */
export function parseReadyUrl(line: string): string | undefined {
  const match = READY_URL_PATTERN.exec(line.trimStart())
  return match?.[1]
}

/**
 * Resolve the dsh CLI bundle beside its package manifest. The desktop package
 * declares `@deepseek-ai/dsh` as a dependency, so this works from the built
 * shell in both a workspace link and a published install.
 * @param from - a `file:` URL the require hook resolves relative to (the caller's `import.meta.url`).
 * @returns the absolute `lib/bin.js` path of the dsh installation.
 */
export function resolveDshBin(from: string): string {
  const require = createRequire(from)
  const manifest = require.resolve('@deepseek-ai/dsh/package.json')
  return join(dirname(manifest), 'lib', 'bin.js')
}

/**
 * Spawn the harness and resolve once it prints its readiness line. The promise
 * rejects when the child exits before readiness or when the readiness wait
 * exceeds {@link READY_TIMEOUT_MS}; the returned handle then owns the child's
 * remaining lifetime.
 * @param options - node executable, dsh bundle path, and optional overrides.
 * @returns the running harness handle, keyed by its ready URL.
 */
export function startHarness(options: HarnessOptions): Promise<HarnessHandle> {
  const args = options.args ?? buildHarnessArgs()
  const child: ChildProcess = spawn(options.nodeExecutable, [options.dshBin, ...args], {
    env: options.env === undefined ? process.env : { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const stdout = child.stdout
  const stderr = child.stderr
  // stdio pipe always yields streams; the guard only narrows the nullable type.
  if (stdout === null || stderr === null) {
    child.kill()
    return Promise.reject(new Error('desktop: failed to pipe the harness output'))
  }

  const onOutput = options.onOutput ?? ((line: string): void => { process.stdout.write(`${line}\n`) })
  const onError = options.onError ?? ((chunk: string): void => { process.stderr.write(chunk) })

  const exited = new Promise<HarnessExit>((resolve) => {
    child.once('exit', (code, signal) => { resolve({ code, signal }) })
  })

  let stopping = false
  const stop = async (): Promise<void> => {
    if (stopping) return
    stopping = true
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM')
      await Promise.race([
        exited.then(() => undefined),
        new Promise<void>((resolve) => {
          setTimeout(() => { child.kill('SIGKILL'); resolve() }, STOP_GRACE_MS)
        }),
      ])
    }
  }

  const ready = new Promise<string>((resolve, reject) => {
    let settled = false
    const settle = (url: string): void => {
      if (settled) return
      settled = true
      clearTimeout(readyTimer)
      resolve(url)
    }
    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(readyTimer)
      reject(error)
    }
    const readyTimer = setTimeout(() => {
      fail(new Error(`desktop: harness did not become ready within ${String(READY_TIMEOUT_MS)}ms`))
      child.kill('SIGKILL')
    }, READY_TIMEOUT_MS)

    const stderrChunks: string[] = []
    stderr.setEncoding('utf8')
    stderr.on('data', (chunk: string) => {
      stderrChunks.push(chunk)
      onError(chunk)
    })

    let stdoutBuffer = ''
    stdout.setEncoding('utf8')
    stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() ?? ''
      for (const line of lines) {
        onOutput(line)
        if (settled) continue
        const url = parseReadyUrl(line)
        if (url !== undefined) settle(url)
      }
    })

    child.once('exit', (code, signal) => {
      const suffix = stderrChunks.join('').trim()
      fail(new Error(
        `desktop: harness exited before becoming ready (code ${String(code)}, signal ${String(signal)})`
        + `${suffix === '' ? '' : `: ${suffix}`}`,
      ))
    })

    // A spawn failure (missing `node`, or a dsh bin not yet built) fires
    // 'error', not 'exit'; fail fast with the cause instead of waiting out the
    // readiness timeout.
    child.once('error', (error) => {
      fail(new Error(`desktop: failed to start the harness (${error.message})`))
    })
  })

  return ready.then((url): HarnessHandle => ({ url, exited, stop }))
}
