import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const reactNativeSvgShim = fileURLToPath(new URL('../../packages/ui/src/web/reactNativeSvg.tsx', import.meta.url))

// The builders season 5 page reads stored gbmetrics reports. gbmetrics sends no CORS headers, so the browser asks
// this app for /gbmetrics/<path> and the app forwards it. Only the two read endpoints are forwarded (exact paths,
// query string allowed); vercel.json has the matching rewrites for production.
const GBMETRICS_ORIGIN = 'https://gbmetrics.gooddollar.org'
const forwardToGbmetrics = {
  target: GBMETRICS_ORIGIN,
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/gbmetrics/, ''),
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '^/gbmetrics/reports(\\?.*)?$': forwardToGbmetrics,
      '^/gbmetrics/getReport(\\?.*)?$': forwardToGbmetrics,
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-svg': reactNativeSvgShim,
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
