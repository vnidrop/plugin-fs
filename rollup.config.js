import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { cwd } from 'node:process'
import typescript from '@rollup/plugin-typescript'

const pkg = JSON.parse(readFileSync(join(cwd(), 'package.json'), 'utf8'))

export default {
  input: {
    index: 'guest-js/index.ts',
    android: 'guest-js/android.ts',
    ios: 'guest-js/ios.ts'
  },
  output: [
    {
      dir: dirname(pkg.exports['.'].import),
      entryFileNames: '[name].js',
      format: 'esm'
    },
    {
      dir: dirname(pkg.exports['.'].require),
      entryFileNames: '[name].cjs',
      format: 'cjs'
    }
  ],
  plugins: [
    typescript({
      declaration: true,
      declarationDir: dirname(pkg.exports['.'].import)
    })
  ],
  external: [
    /^@tauri-apps\/api/,
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {})
  ]
}
