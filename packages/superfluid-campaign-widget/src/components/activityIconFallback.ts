import type { IconName } from '@goodwidget/ui'
import type { ActivityType } from '../widgetRuntimeContract'

/**
 * ACTIVITY_ICON_MAP's iconName values (calendar, person-plus, megaphone, stream,
 * hand-coin) are not present in @goodwidget/ui's Icon SVG registry yet. Substitute
 * the closest available registered glyph per activity until those icons are added
 * to the shared registry.
 */
export const ACTIVITY_ICON_NAME_FALLBACK: Record<ActivityType, IconName> = {
  'claim-ubi': 'check',
  'invite-users': 'user',
  'flow-state-vote': 'arrow-up',
  'flow-state-funding': 'arrows-left-right',
  'gardens-donation': 'wallet',
  'gardens-funding': 'refresh',
}
