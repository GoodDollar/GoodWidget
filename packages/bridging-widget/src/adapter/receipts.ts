import type { TransactionReceipt } from 'viem'

export function requireSuccessfulReceipt(receipt: TransactionReceipt, step: 'approval' | 'bridge'): TransactionReceipt {
  if (receipt.status === 'reverted') throw new Error(`${step} transaction reverted on-chain.`)
  return receipt
}
