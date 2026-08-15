import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { buildHarnessArgs, parseReadyUrl, resolveDshBin, startHarness, type HarnessExit, type HarnessHandle } from '../src/harness.ts'

const fixture = fileURLToPath(new URL('./fixtures/fake-harness.mjs', import.meta.url))

const handles: HarnessHandle[] = []
afterEach(async () => {
  await Promise.all(handles.splice(0).map(handle => handle.stop()))
})

describe('parseReadyUrl', () => {
  it('extracts the loopback URL from the readiness line', () => {
    expect(parseReadyUrl('dsh web: http://127.0.0.1:3080')).toBe('http://127.0.0.1:3080')
    expect(parseReadyUrl('dsh web: http://127.0.0.1:51234 (LAN: http://192.168.1.5:51234)'))
      .toBe('http://127.0.0.1:51234')
  })

  it('ignores non-readiness lines and non-loopback URLs', () => {
    expect(parseReadyUrl('dsh web: http://192.168.1.5:3080')).toBeUndefined()
    expect(parseReadyUrl('some other line')).toBeUndefined()
    expect(parseReadyUrl('')).toBeUndefined()
  })
})

describe('buildHarnessArgs', () => {
  it('boots the web profile on an OS-assigned port', () => {
    expect(buildHarnessArgs()).toEqual(['web', '--port', '0'])
  })
})

describe('resolveDshBin', () => {
  it('resolves the dsh CLI bundle beside its package manifest', () => {
    expect(resolveDshBin(import.meta.url).endsWith(join('lib', 'bin.js'))).toBe(true)
  })
})

describe('startHarness', () => {
  it('resolves the printed readiness URL and stops the child on SIGTERM', async () => {
    const handle = await startHarness({
      nodeExecutable: process.execPath,
      dshBin: fixture,
      args: [],
      env: { FAKE_PORT: '51987' },
      onOutput: () => {},
      onError: () => {},
    })
    handles.push(handle)
    expect(handle.url).toBe('http://127.0.0.1:51987')
    await handle.stop()
    // SIGTERM is a graceful exit 0 on POSIX; Windows force-terminates (signal set).
    const exit: HarnessExit = await handle.exited
    expect(exit.signal === 'SIGTERM' || exit.code === 0).toBe(true)
  })

  it('rejects when the child exits before printing readiness', async () => {
    await expect(startHarness({
      nodeExecutable: process.execPath,
      dshBin: fixture,
      args: ['--fail'],
      onOutput: () => {},
      onError: () => {},
    })).rejects.toThrow(/before becoming ready/)
  })

  it('rejects fast when the harness executable cannot be spawned', async () => {
    await expect(startHarness({
      nodeExecutable: fileURLToPath(new URL('./fixtures/no-such-node', import.meta.url)),
      dshBin: fixture,
      onOutput: () => {},
      onError: () => {},
    })).rejects.toThrow(/failed to start the harness/)
  })
})
