import React from 'react'
import { createRoot } from 'react-dom/client'
import type { CitizenClaimWidgetProps } from '@goodwidget/citizen-claim-widget'
import { EcosystemWidget } from '../src/EcosystemWidget'

document.getElementById('storybook-root')!.style.display = 'none'
const container = document.createElement('div')
container.id = 'fixture-root'
document.body.appendChild(container)
const root = createRoot(container)

const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const provider = {
  on() {},
  removeListener() {},
  request: async ({ method }: { method: string }) =>
    method === 'eth_accounts' ? [address] : '0xa4ec',
}
const bundle = {} as NonNullable<CitizenClaimWidgetProps['claimExecution']>['clientsByChain'][number]
const claimExecution = { mode: 'custodial' as const, clientsByChain: { 42220: bundle, 122: bundle, 50: bundle } }
const factoryCalls: number[] = []
const clientFactory: NonNullable<CitizenClaimWidgetProps['clientFactory']> = ({ chainId }) => {
  factoryCalls.push(chainId)
  return bundle!
}

export function getFactoryCalls() {
  return factoryCalls
}

export function render({ chainId, supported, available, custodial = true }: {
  chainId: number | null
  supported?: number[]
  available?: number[]
  custodial?: boolean
}) {
  root.render(
    <EcosystemWidget
      widgets={['citizen-claim']}
      provider={provider}
      addressOverride={address}
      chainIdOverride={chainId}
      availableChainIdsOverride={available}
      supportedChains={supported === undefined ? undefined : { 'citizen-claim': supported }}
      widgetProps={{ 'citizen-claim': { claimExecution: custodial ? claimExecution : undefined, clientFactory } }}
    />,
  )
}
