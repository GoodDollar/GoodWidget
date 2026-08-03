import { keccak256, toBytes, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const SECP256K1_ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n

export function buildBuyerKeyMessage(payerAddress: string): string {
  return `Generate a key for G$ credits from payer wallet of '${payerAddress.toLowerCase()}'`
}

export function deriveBuyerPrivateKeyFromSignature(signature: Hex): `0x${string}` {
  for (let counter = 0; counter < 256; counter++) {
    const hash =
      counter === 0 ? keccak256(signature) : keccak256(toBytes(`${signature}:${counter}`))
    const candidate = BigInt(hash)

    if (candidate <= 0n || candidate >= SECP256K1_ORDER) {
      continue
    }

    const privateKey = `0x${candidate.toString(16).padStart(64, '0')}` as `0x${string}`
    try {
      privateKeyToAccount(privateKey)
      return privateKey
    } catch {
      continue
    }
  }

  throw new Error('Could not derive a valid buyer key from wallet signature')
}
