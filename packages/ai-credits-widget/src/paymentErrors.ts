import { isUserRejectedWalletRequest } from './goodIdVerification'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error ?? '')
}

function looksLikeRawChainError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    message.includes('\n') ||
    message.length > 160 ||
    lower.includes('request arguments') ||
    lower.includes('contract call') ||
    lower.includes('docs:') ||
    lower.includes('version: viem') ||
    lower.includes('http request failed') ||
    lower.includes('execution reverted') ||
    lower.includes('transaction reverted') ||
    lower.includes('raw call argument')
  )
}

function isInsufficientGBalance(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('insufficient funds') ||
    lower.includes('insufficient balance') ||
    lower.includes('transfer amount exceeds balance') ||
    lower.includes('exceeds balance') ||
    lower.includes('not enough g$')
  )
}

export function mapPaymentError(error: unknown): string {
  console.error('[AiCreditsWidget]', error)

  if (isUserRejectedWalletRequest(error)) {
    return 'Transaction cancelled'
  }

  const message = errorMessage(error).trim()
  if (isInsufficientGBalance(message)) {
    return 'Not enough G$ for this payment'
  }

  if (message && !looksLikeRawChainError(message)) {
    return message
  }

  return 'Payment failed. Try again.'
}
