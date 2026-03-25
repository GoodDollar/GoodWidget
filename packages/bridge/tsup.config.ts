import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    child: 'src/child.ts',
    host: 'src/host.ts',
    inject: 'src/inject.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  external: ['react', 'react-dom', 'react-native', 'react-native-web', '@goodwidget/core'],
})
