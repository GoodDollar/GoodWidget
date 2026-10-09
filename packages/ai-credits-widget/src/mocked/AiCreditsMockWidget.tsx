import { useMemo } from 'react'
import { AiCreditsWidget, type AiCreditsWidgetProps } from '..'
import { MockAiCreditsBackendClient } from './backendClient'
import { MockAiCreditsChainClient } from './chainClient'

export function MockAiCreditsWidget(props: Omit<AiCreditsWidgetProps, 'adapterOptions' | 'environment'>) {
  const backendClient = useMemo(() => new MockAiCreditsBackendClient(), [])
  const chainClient = useMemo(() => new MockAiCreditsChainClient(), [])

  return (
    <AiCreditsWidget
      {...props}
      environment="development"
      adapterOptions={{
        backendClient,
        chainClient,
        skipVaultPaymentValidation: true,
        prepareSettlement: (ref, creditUsd) => backendClient.prepareSettlement(ref, creditUsd),
      }}
    />
  )
}
