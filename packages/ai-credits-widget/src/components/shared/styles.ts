import type React from 'react'

export const monospaceSingleLineStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 10)}…${address.slice(-6)}`
}

export const compactButtonProps = {
  borderRadius: '$2',
  height: '$7',
} as const

