import { Text } from '@goodwidget/ui'

/** Keeps the live-region text available to screen readers without showing it. */
const visuallyHiddenStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
} as const

/** Announces that a copy succeeded. Carries only the outcome, never the copied text. */
export function CopyAnnouncement({ copied }: { copied: boolean }) {
  return (
    <Text aria-live="polite" fontSize="$1" style={visuallyHiddenStyle}>
      {copied ? 'Copied' : ''}
    </Text>
  )
}
