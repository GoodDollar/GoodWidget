import { defineConfig, type Options } from 'tsup'
import { fileURLToPath } from 'node:url'

const reactNativeSvgShim = fileURLToPath(new URL('./src/web/reactNativeSvg.tsx', import.meta.url))

const sharedConfig: Pick<Options, 'format' | 'dts' | 'sourcemap' | 'external'> = {
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'react-native', 'react-native-web', '@react-native-clipboard/clipboard'],
}

export default defineConfig([
  {
    ...sharedConfig,
    entry: ['src/index.ts'],
    clean: true,
  },
  {
    ...sharedConfig,
    entry: ['src/web.ts'],
    clean: false,
    // The native build keeps the package external. The web build bundles the
    // icon modules so their react-native-svg import can use the DOM shim.
    noExternal: ['@tamagui/lucide-icons', 'react-native-svg'],
    esbuildOptions(options) {
      options.alias = {
        ...options.alias,
        'react-native-svg': reactNativeSvgShim,
      }
    },
  },
])
