import { CalendarDays, HandCoins, Megaphone, UserPlus, Waves } from '@goodwidget/ui'
import type { ActivityType } from '../widgetRuntimeContract'

/** Exact glyph mapping from the approved design reference (#127) — do not substitute. */
export const ACTIVITY_ICON_COMPONENT: Record<ActivityType, typeof CalendarDays> = {
  'claim-ubi': CalendarDays,
  'invite-users': UserPlus,
  'flow-state-vote': Megaphone,
  'flow-state-funding': Waves,
  'gardens-donation': HandCoins,
  'gardens-funding': Waves,
}

/** Resolves an activity's done-state to the color token its lucide icon should render in. */
export function resolveActivityIconColorToken(
  colorVariant: 'blue' | 'green',
  isDone: boolean,
): string {
  if (!isDone) return '$placeholderColor'
  return colorVariant === 'green' ? '$success' : '$primary'
}
