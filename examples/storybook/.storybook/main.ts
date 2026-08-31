/**
 * Storybook main configuration.
 *
 * - Framework: @storybook/react-vite
 * - Addons: essentials (controls, docs, actions) + interactions (play functions)
 * - viteFinal: mirrors the react-native-web + Tamagui settings from examples/react-web
 */
import type { StorybookConfig } from '@storybook/react-vite'

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
      },
    }
    config.optimizeDeps = {
      ...config.optimizeDeps,
      // Storybook loads this preview annotation through a virtual module. When it is
      // pre-bundled alongside the branch's larger widget dependency graph, Vite can
      // discover a new shared chunk after the first browser request and invalidate the
      // URL that Storybook already emitted. It is a small ESM module, so serving it
      // directly avoids that dev-only optimizer race while preserving interactions.
      exclude: [
        ...(config.optimizeDeps?.exclude ?? []),
        '@storybook/addon-interactions/preview',
      ],
      // MDX docs load these dependencies lazily. Include them in the initial
      // dependency scan so opening a docs page cannot trigger a second Vite
      // optimization pass and invalidate chunk URLs already in the browser.
      include: [
        ...(config.optimizeDeps?.include ?? []),
        '@storybook/blocks',
        '@mdx-js/react',
      ],
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
