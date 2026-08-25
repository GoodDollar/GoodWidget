import { useWallet } from '@goodwidget/core'
import { useAiCreditsStore } from './store'
import { backendClient } from './api'
import { chainClient } from './chain'
import { resolveDeepLinkParams } from './deepLinkParams'
import { useMemo } from 'eact'

export const useAiCreditsAdapter = () => {
  const { address } = useWallet()
  const { setOperatorConsented, setBuyerAddress } = useAiCreditsStore()

  const handleApplyDeepLinkBuyer = async (params: any) => {
    if (params.buyerAddress) {
      setBuyerAddress(params.buyerAddress)
    }
    // REMOVED: Silent auto-submission of operator consent
    // Previously: 
    // await backendClient.submitOperatorConsent({ address: params.buyerAddress, signature: params.operatorSignature })
    // setOperatorConsented(true)
  }

  const handleSignOperatorConsent = async (signature?: string) => {
    if (!address) return
    if (signature) {
      await backendClient.submitOperatorConsent({ address, signature })
      setOperatorConsented(true)
    } else {
      // In-app signing logic
      const res = await chainClient.signOperatorConsent(address)
      await backendClient.submitOperatorConsent({ address, signature: res.signature })
      setOperatorConsented(true)
    }
  }

  return {
    handleApplyDeepLinkBuyer,
    handleSignOperatorConsent,
  }
}
