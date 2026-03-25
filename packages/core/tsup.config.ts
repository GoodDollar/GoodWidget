import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    wagmi: 'src/wagmi.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  external: ['react', 'react-dom', 'react-native', 'react-native-web', 'wagmi', 'viem', '@wagmi/core', 'tamagui', '@tamagui/core', '@goodwidget/ui'],
})
