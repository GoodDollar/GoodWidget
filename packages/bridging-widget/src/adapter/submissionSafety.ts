import type { Hash, TransactionReceipt, WalletClient } from 'viem'
import {
  BRIDGE_CONTRACT_ADDRESSES,
  BridgingSDK,
  type BridgeFeeQuote,
  type BridgeProtocol,
  type BridgeStatus,
} from '@goodsdks/bridging-sdk'
import type { Address } from 'viem'

export class BridgeQuoteChangedError extends Error {
  readonly code = 'BRIDGE_QUOTE_CHANGED'

  constructor() {
    super('Bridge fees changed. Review the updated quote before confirming again.')
  }
}

export class BridgeConfirmationUnavailableError extends Error {
  readonly code = 'BRIDGE_CONFIRMATION_UNAVAILABLE'
  readonly transactionHash: Hash

  constructor(transactionHash: Hash, cause: unknown) {
    super('Bridge transaction was sent, but confirmation is unavailable. Check the source transaction before trying again.', { cause })
    this.transactionHash = transactionHash
  }
}

export function assertReviewedQuote(reviewed: BridgeFeeQuote, latest: BridgeFeeQuote): void {
  if (
    latest.fee > reviewed.fee ||
    latest.protocolFee > reviewed.protocolFee ||
    latest.amountReceived < reviewed.amountReceived ||
    latest.amount !== reviewed.amount ||
    latest.targetChainId !== reviewed.targetChainId ||
    latest.protocol !== reviewed.protocol ||
    latest.target.toLowerCase() !== reviewed.target.toLowerCase()
  ) throw new BridgeQuoteChangedError()
}

export function requireSuccessfulReceipt(receipt: TransactionReceipt, step: 'approval' | 'bridge'): TransactionReceipt {
  if (receipt.status === 'reverted') throw new Error(`${step} transaction reverted on-chain.`)
  return receipt
}

interface SubmissionGuard {
  quote: BridgeFeeQuote | null
  sourceChainId: number | null
  bridgeHash: Hash | null
  receiptSeen: boolean
}

function guardWalletWrites(client: WalletClient | undefined, guard: SubmissionGuard): WalletClient | undefined {
  // SDK 1.0.6 may re-estimate fees after approval. Enforce the reviewed ceiling
  // on the actual bridge request, while leaving token approvals unchanged.
  return client?.extend(() => ({
    writeContract: async (request: Parameters<WalletClient['writeContract']>[0]) => {
      const bridgeAddress = guard.sourceChainId === null ? undefined : BRIDGE_CONTRACT_ADDRESSES[guard.sourceChainId]
      const reviewedQuote = guard.quote
      const isBridge = reviewedQuote !== null && bridgeAddress?.toLowerCase() === request.address.toLowerCase()
      if (isBridge && reviewedQuote && (request.value ?? 0n) > reviewedQuote.fee) {
        throw new BridgeQuoteChangedError()
      }
      const hash = await client.writeContract(request)
      if (isBridge) guard.bridgeHash = hash
      return hash
    },
  })) as WalletClient | undefined
}

export class CheckedBridgingSDK extends BridgingSDK {
  private readonly submissionGuard: SubmissionGuard

  constructor(...args: ConstructorParameters<typeof BridgingSDK>) {
    const guard: SubmissionGuard = { quote: null, sourceChainId: null, bridgeHash: null, receiptSeen: false }
    super(args[0], guardWalletWrites(args[1], guard), args[2], args[3], args[4])
    this.submissionGuard = guard
  }

  override setWalletClient(client: WalletClient): void {
    super.setWalletClient(guardWalletWrites(client, this.submissionGuard)!)
  }

  override async doBridge(quote: BridgeFeeQuote, onStatus?: (status: BridgeStatus) => void): Promise<TransactionReceipt> {
    if (this.submissionGuard.quote) throw new Error('A bridge transaction is already in progress.')
    this.submissionGuard.quote = Object.freeze({ ...quote })
    this.submissionGuard.sourceChainId = this.getCurrentChainId()
    this.submissionGuard.bridgeHash = null
    this.submissionGuard.receiptSeen = false
    try {
      return await super.doBridge(quote, onStatus)
    } catch (error) {
      if (this.submissionGuard.bridgeHash && !this.submissionGuard.receiptSeen) {
        throw new BridgeConfirmationUnavailableError(this.submissionGuard.bridgeHash, error)
      }
      throw error
    } finally {
      this.submissionGuard.quote = null
      this.submissionGuard.sourceChainId = null
      this.submissionGuard.bridgeHash = null
      this.submissionGuard.receiptSeen = false
    }
  }

  override async approve(amount: bigint): Promise<TransactionReceipt> {
    return requireSuccessfulReceipt(await super.approve(amount), 'approval')
  }

  override async bridgeTo(target: Address, targetChainId: number, amount: bigint, protocol: BridgeProtocol): Promise<TransactionReceipt> {
    const receipt = await super.bridgeTo(target, targetChainId, amount, protocol)
    this.submissionGuard.receiptSeen = true
    return requireSuccessfulReceipt(receipt, 'bridge')
  }
}
