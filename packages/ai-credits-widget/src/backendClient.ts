export interface OperatorConsentRequest {
  buyer: string
}

export interface AiCreditsBackendClient {
  submitOperatorConsent: (payload: any) => Promise<void>
  revokeOperatorConsent: (buyer: string) => Promise<void>
}
