import React, { useState } from 'react'
import type { CitizenClaimWidgetProps } from '@goodwidget/citizen-claim-widget'

export function CitizenClaimWidget(props: CitizenClaimWidgetProps) {
  const [result, setResult] = useState('')
  const tryFactory = async (chainId: number) => {
    try {
      await props.clientFactory?.({ provider: {}, address: '0x1234', chainId })
      setResult(`allowed ${chainId}`)
    } catch {
      setResult(`blocked ${chainId}`)
    }
  }
  return (
    <div>
      <output data-testid="claim-clients">
        {Object.keys(props.claimExecution?.clientsByChain ?? {}).sort().join(',')}
      </output>
      <output data-testid="claim-available">{props.availableChainIdsOverride?.join(',')}</output>
      <output data-testid="factory-result">{result}</output>
      <button onClick={() => void tryFactory(122)}>Factory Fuse</button>
      <button onClick={() => void tryFactory(42220)}>Factory Celo</button>
    </div>
  )
}
