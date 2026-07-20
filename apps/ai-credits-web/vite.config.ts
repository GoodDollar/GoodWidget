import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-svg': new URL('./src/reactNativeSvgWeb.tsx', import.meta.url).pathname,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: [
        '.web.js',
        '.web.jsx',
        '.web.ts',
        '.web.tsx',
        '.mjs',
        '.js',
        '.mts',
        '.ts',
        '.jsx',
        '.tsx',
        '.json',
      ],
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
