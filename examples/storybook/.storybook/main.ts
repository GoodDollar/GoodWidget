/**
 * Storybook main configuration.
 *
 * - Framework: @storybook/react-vite
 * - Addons: essentials (controls, docs, actions) + interactions (play functions)
 * - viteFinal: mirrors the react-native-web + Tamagui settings from examples/react-web
 */
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'

const reactNativeSvgShim = fileURLToPath(new URL('../src/shims/reactNativeSvg.tsx', import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  tags: {
    manual: {
      defaultFilterSelection: 'exclude',
    },
  },
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: async (config) => {
    // Mirror the Vite settings from examples/react-web so Tamagui + react-native-web resolve.
    config.define = {
      ...config.define,
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
      'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
    }
    config.resolve = {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias as Record<string, string> | undefined),
        'react-native': 'react-native-web',
        'react-native-svg': reactNativeSvgShim,
      },
    }
    config.optimizeDeps = {
      ...config.optimizeDeps,
      esbuildOptions: {
        ...config.optimizeDeps?.esbuildOptions,
        resolveExtensions: [
          '.web.js', '.web.jsx', '.web.ts', '.web.tsx',
          '.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json',
        ],
        loader: {
          '.js': 'jsx',
        },
      },
    }
    return config
  },
}

export default config
