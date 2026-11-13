import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AiCreditsWidget } from '../src/AiCreditsWidget'
import { AiCreditsWidgetElement } from '../src/element'
import type { AiCreditsWidgetAdapterFactory, AiCreditsWidgetTab } from '../src/widgetRuntimeContract'

document.getElementById('storybook-root')!.style.display = 'none'
const container = document.createElement('div')
container.id = 'fixture-root'
document.body.appendChild(container)
const root = createRoot(container)
const address = '0x329377cbeeF39f01b0Ea04B80465c9eB47D3ED1'

function Fixture({ hideHeader, showWalletControls }: { hideHeader?: boolean; showWalletControls?: boolean }) {
  const [activeTab, setActiveTab] = useState<AiCreditsWidgetTab>('setup')
  const adapterFactory: AiCreditsWidgetAdapterFactory = () => ({
    state: {
      status: 'quote_ready', address, chainId: 42220, activeTab, gBalance: '42.50',
      gdUsdPerToken: 0.0015, totalCreditUsd: null, totalBonusUsd: null,
      isGoodIdVerified: false, signerPubKey: null, signerPrvKey: null,
      operatorSignature: null, operatorConsented: false, operatorConsentPending: false,
      operatorAddress: null, currentOperator: null, minDepositUsd: '1.00',
      minStreamUsd: '1.00', totalGdDepositedG: null, monthlyStreamG: null,
      withdrawableUsd: null, depositBonusPercent: 10, streamBonusPercent: 20,
      error: null, signers: [], derivedSignerAddress: null,
    },
    actions: {
      connect: async () => {}, switchChain: async () => {}, generateSignerKey: async () => {},
      selectSigner: async () => {}, discoverSigners: () => {},
      importSignerFromPrivateKey: async () => null, applyDeepLinkSigner: async () => {},
      signOperatorConsent: async () => {}, revokeOperatorConsent: async () => {},
      syncOperatorConsentFromChain: async () => {},
      buildQuote: async (depositAmountG, streamAmountG) => ({ depositAmountG, streamAmountG }),
      pay: async () => {}, refresh: async () => {}, verifyGoodId: async () => false,
      startPurchase: () => {}, setActiveTab, closeChannel: async () => {},
      withdrawCredits: async () => {}, retry: async () => {},
    },
  })

  return (
    <AiCreditsWidget
      environment="development"
      addressOverride={address}
      chainIdOverride={42220}
      adapterFactory={adapterFactory}
      hideHeader={hideHeader}
      showWalletControls={showWalletControls}
    />
  )
}

export function render(hideHeader?: boolean, showWalletControls?: boolean) {
  root.render(<Fixture hideHeader={hideHeader} showWalletControls={showWalletControls} />)
}

export function mountElement() {
  const tag = 'test-ai-credits-header'
  if (!customElements.get(tag)) customElements.define(tag, AiCreditsWidgetElement)
  document.body.appendChild(document.createElement(tag))
}
