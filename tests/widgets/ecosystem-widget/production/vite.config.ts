import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../..')
const fixture = resolve(root, 'tests/widgets/ecosystem-widget/production')
const exampleModules = resolve(root, 'examples/react-web/node_modules')

const widgetPackages: Record<string, string> = {
  'citizen-claim': 'citizen-claim-widget',
  goodreserve: 'goodreserve-widget',
  streaming: 'streaming-widget',
  'ai-credits': 'ai-credits-widget',
}

function owners(id: string) {
  const normalized = id.replaceAll('\\', '/')
  return Object.entries(widgetPackages)
    .filter(([, name]) => normalized.includes(`/packages/${name}/`))
    .map(([widget]) => widget)
}

export default {
  root: fixture,
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  resolve: {
    alias: [
      { find: '@goodwidget/ecosystem-widget/register', replacement: resolve(root, 'packages/ecosystem-widget/dist/register.js') },
      { find: '@goodwidget/ecosystem-widget', replacement: resolve(root, 'packages/ecosystem-widget/dist/index.js') },
      { find: /^react-native$/, replacement: resolve(exampleModules, 'react-native-web') },
      { find: /^react-dom(?=\/|$)/, replacement: resolve(exampleModules, 'react-dom') },
      { find: /^react(?=\/|$)/, replacement: resolve(exampleModules, 'react') },
    ],
  },
  plugins: [{
    name: 'widget-chunk-ownership',
    generateBundle(_options: unknown, bundle: Record<string, any>) {
      const chunks = Object.values(bundle)
        .filter((item) => item.type === 'chunk')
        .map((chunk) => ({
          file: chunk.fileName,
          facadeOwners: chunk.facadeModuleId ? owners(chunk.facadeModuleId) : [],
          owners: [...new Set(Object.entries(chunk.modules)
            .filter(([, module]) => (module as { renderedLength: number }).renderedLength > 0)
            .flatMap(([id]) => owners(id)))],
          dynamic: chunk.isDynamicEntry,
        }))
      this.emitFile({ type: 'asset', fileName: 'widget-chunks.json', source: JSON.stringify(chunks, null, 2) })
    },
  }],
  build: {
    outDir: resolve(fixture, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(fixture, 'index.html'),
        element: resolve(fixture, 'element.html'),
      },
    },
  },
}
