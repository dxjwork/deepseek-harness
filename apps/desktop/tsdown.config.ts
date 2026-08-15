import { defineConfig } from 'tsdown'

/**
 * The desktop shell ships one entry: the Electron main pointed at by
 * package.json `main`. The root tsdown builds only lib/types/{index,invariant,
 * startup}.js, so this override points at lib/types/main.js; the harness module
 * it imports bundles alongside it. `electron` is provided by the Electron
 * runtime (never resolvable as an ordinary node_module), so it is never bundled.
 * Declarations come from `tsc -b` (dts: false), matching every package.
 */
export default defineConfig({
  entry: ['lib/types/main.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: {
    neverBundle: ['electron'],
  },
})
