import React from 'react'
import { BuyGdView } from './BuyGdView'
import { useBuyGdAdapter } from './useBuyGdAdapter'

export function LiveBuyGdWidgetInner({
  onramperUrl,
  pollIntervalMs,
}: {
  onramperUrl: string
  pollIntervalMs: number
}) {
  const adapter = useBuyGdAdapter({ pollIntervalMs })
  return <BuyGdView adapter={adapter} onramperUrl={onramperUrl} />
}
