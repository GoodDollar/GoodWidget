import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const reactNativeSvgShim = fileURLToPath(new URL('./src/shims/reactNativeSvg.tsx', import.meta.url))

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      // react-native-svg's Fabric native modules are not available in react-native-web.
      'react-native-svg': reactNativeSvgShim,
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
})
