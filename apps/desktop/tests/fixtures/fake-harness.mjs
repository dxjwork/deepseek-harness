/**
 * Fake `dsh web` child for the harness lifecycle suite. It prints the
 * readiness line the real web app prints, then stays alive until SIGTERM so
 * the stop path is exercised. `--fail` exits before readiness to exercise the
 * early-exit rejection.
 */
const port = process.env.FAKE_PORT ?? '51234'
if (process.argv.includes('--fail')) {
  console.error('fake harness: intentional failure')
  process.exit(1)
}
console.log(`dsh web: http://127.0.0.1:${port}`)
process.on('SIGTERM', () => { process.exit(0) })
setInterval(() => {}, 1000)
