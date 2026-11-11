import type { GoodWidgetConfig } from '@goodwidget/core'
import { defaultTokenPreset } from '@goodwidget/ui'

const color = defaultTokenPreset.tokens.color

/**
 * Component themes of the passkey login widget. `PasskeyProviderTile` is the selectable
 * Google Drive / iCloud tile; its surface sits on the card, so it uses the page background
 * and the regular border colors of each mode.
 */
export const passkeyLoginWidgetConfig = {
  themes: {
    light_PasskeyProviderTile: {
      background: color.governanceBackground,
      backgroundHover: color.governanceBackgroundHover,
      backgroundPress: color.governanceBackgroundPress,
      backgroundFocus: color.governanceBackgroundFocus,
      borderColor: color.governanceBorder,
      borderColorFocus: color.governancePrimary,
    },
    dark_PasskeyProviderTile: {
      background: color.backgroundDark,
      backgroundHover: color.surfaceAlt,
      backgroundPress: color.backgroundInput,
      backgroundFocus: color.surfaceAlt,
      borderColor: color.borderDark,
      borderColorFocus: color.primary,
    },
  },
} as const satisfies GoodWidgetConfig
