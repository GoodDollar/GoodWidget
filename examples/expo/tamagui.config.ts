/**
 * Re-export the GoodWidget Tamagui config so the Tamagui babel plugin
 * can statically extract styles at build time.
 */
import { createGoodWidgetConfig } from '@goodwidget/ui'

const config = createGoodWidgetConfig()

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
