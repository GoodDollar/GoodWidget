// Mirrors the compactButtonProps convention established in
// ai-credits-widget/src/components/shared/styles.ts — spread onto every
// <Button size="sm"> in this package so button proportions stay consistent
// with the rest of the GoodWidget suite.
export const compactButtonProps = {
  borderRadius: '$3',
  height: '$7',
  paddingHorizontal: '$3',
} as const
