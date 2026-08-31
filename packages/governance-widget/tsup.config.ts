import { defineConfig, type Options } from 'tsup'
import { fileURLToPath } from 'node:url'

const reactNativeSvgShim = fileURLToPath(new URL('../ui/src/web/reactNativeSvg.tsx', import.meta.url))

const sharedConfig: Pick<Options, 'format' | 'dts' | 'sourcemap' | 'external'> = {
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'react-native', 'react-native-web', 'react-native-svg'],
}

export default defineConfig([
  {
    ...sharedConfig,
    entry: ['src/index.ts'],
    clean: true,
    tsconfig: 'tsconfig.build.json',
  },
  {
    ...sharedConfig,
    entry: ['src/web.ts'],
    clean: false,
    tsconfig: 'tsconfig.build.json',
    noExternal: ['react-native-svg'],
    esbuildOptions(options) {
      options.alias = {
        ...options.alias,
        'react-native-svg': reactNativeSvgShim,
      }
    },
  },
])
