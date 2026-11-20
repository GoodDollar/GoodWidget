import { useMemo } from 'react'
import { AiCreditsWidget, type AiCreditsWidgetProps } from '..'
import { MockAiCreditsApi } from './aiCreditsApi'
import { MockAiCreditsBackendClient } from './backendClient'
import { MockAiCreditsChainClient } from './chainClient'

export function MockAiCreditsWidget(props: Omit<AiCreditsWidgetProps, 'adapterOptions' | 'environment'>) {
  const backendClient = useMemo(() => new MockAiCreditsBackendClient(), [])
  const chainClient = useMemo(() => new MockAiCreditsChainClient(), [])
  const aiCreditsApi = useMemo(() => new MockAiCreditsApi(), [])

  return (
    <AiCreditsWidget
      {...props}
      environment="development"
      aiCreditsApi={aiCreditsApi}
      adapterOptions={{
        backendClient,
        chainClient,
        skipVaultPaymentValidation: true,
        prepareSettlement: (ref, creditUsd) => backendClient.prepareSettlement(ref, creditUsd),
      }}
    />
  )
}
