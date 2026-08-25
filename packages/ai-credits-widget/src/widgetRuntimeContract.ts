export interface AiCreditsActions {
  signOperatorConsent: (payload: any) => Promise<void>
  revokeOperatorConsent: () => Promise<void>
}

export interface AiCreditsRuntimeState {
  operatorConsented: boolean
  operatorConsentPending: boolean
  operatorAddress: string | null
}
