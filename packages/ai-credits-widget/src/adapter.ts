export const handleRevokeOperatorConsent = async (client: AiCreditsBackendClient, buyer: string) => {
  await client.revokeOperatorConsent(buyer)
}