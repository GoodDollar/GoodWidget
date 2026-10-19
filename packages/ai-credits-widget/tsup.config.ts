import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    element: 'src/element.ts',
    register: 'src/register.ts',
    'mocked/index': 'src/mocked/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  external: ['react', 'react-dom', 'react-native', 'react-native-web'],
  // Screenshots ship inside the bundle rather than as separate files: the widget
  // embeds into third-party pages, where a relative asset URL would not resolve
  // and a remote one can be blocked by the host's img-src policy.
  loader: { '.png': 'dataurl' },
})
