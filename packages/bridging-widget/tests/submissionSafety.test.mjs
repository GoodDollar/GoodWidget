import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BRIDGE_CONTRACT_ADDRESSES, SUPPORTED_CHAINS } from '@goodsdks/bridging-sdk'
import { assertReviewedQuote, CheckedBridgingSDK } from '../src/adapter/submissionSafety.ts'

const account = '0x1111111111111111111111111111111111111111'
const approvalHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const bridgeHash = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const quote = {
  fee: 100n, feeInNative: '0.0000000000000001 CELO', protocol: 'AXELAR',
  target: account, targetChainId: 1, amount: 10n ** 19n,
  protocolFeeBps: 10n, protocolFee: 1n, amountReceived: 999n,
}

function fixture() {
  let allowance = 0n
  let fee = 100n
  let approvalStatus = 'success'
  let bridgeStatus = 'success'
  let receiptUnavailable = false
  const writes = []
  const statuses = []
  const client = {
    chain: { id: 42220 },
    readContract: async ({ functionName }) => {
      assert.equal(functionName, 'allowance')
      return allowance
    },
    simulateContract: async (request) => ({ request }),
    waitForTransactionReceipt: async ({ hash }) => {
      if (hash === bridgeHash && receiptUnavailable) throw new Error('HTTP request failed during receipt lookup')
      return { transactionHash: hash, status: hash === approvalHash ? approvalStatus : bridgeStatus }
    },
  }
  const wallet = {
    chain: { id: 42220 },
    getAddresses: async () => [account],
    writeContract: async (request) => {
      writes.push(request)
      if (request.functionName === 'approve') {
        assert.equal(request.address.toLowerCase(), SUPPORTED_CHAINS[42220].tokenAddress.toLowerCase())
        allowance = request.args[1]
        return approvalHash
      }
      assert.equal(request.address.toLowerCase(), BRIDGE_CONTRACT_ADDRESSES[42220].toLowerCase())
      return bridgeHash
    },
    extend(extension) {
      return { ...this, ...extension(this) }
    },
  }
  const sdk = new CheckedBridgingSDK(client, wallet, 42220)
  sdk.estimateFee = async () => ({ fee, feeInNative: 'test estimate', protocol: 'AXELAR' })
  return {
    sdk, writes, statuses,
    setFee: (value) => { fee = value },
    setApprovalStatus: (value) => { approvalStatus = value },
    setBridgeStatus: (value) => { bridgeStatus = value },
    failBridgeReceipt: () => { receiptUnavailable = true },
    onStatus(status) { statuses.push(status.step) },
  }
}

test('accepted fees execute the real SDK approval and bridge sequence', async () => {
  const f = fixture()
  const receipt = await f.sdk.doBridge(quote, f.onStatus)
  assert.equal(receipt.transactionHash, bridgeHash)
  assert.deepEqual(f.writes.map((request) => request.functionName), ['approve', 'bridgeTo'])
  assert.deepEqual(f.statuses, ['approving', 'bridging', 'completed'])
})

test('a higher fee after approval cannot reach the wallet until re-reviewed', async () => {
  const f = fixture()
  await assert.rejects(f.sdk.doBridge(quote, (status) => {
    f.onStatus(status)
    if (status.step === 'bridging') f.setFee(150n)
  }), { code: 'BRIDGE_QUOTE_CHANGED' })
  assert.deepEqual(f.writes.map((request) => request.functionName), ['approve'])

  const receipt = await f.sdk.doBridge({ ...quote, fee: 150n }, f.onStatus)
  assert.equal(receipt.transactionHash, bridgeHash)
  assert.deepEqual(f.writes.map((request) => request.functionName), ['approve', 'bridgeTo'])
  assert.equal(f.writes[1].value, 150n)
})

test('a lower actual native fee is allowed', async () => {
  const f = fixture()
  f.setFee(80n)
  await f.sdk.doBridge(quote)
  assert.equal(f.writes[1].value, 80n)
})

test('reverted approval stops the SDK before a bridge write', async () => {
  const f = fixture()
  f.setApprovalStatus('reverted')
  await assert.rejects(f.sdk.doBridge(quote), /approval transaction reverted/)
  assert.deepEqual(f.writes.map((request) => request.functionName), ['approve'])
})

test('reverted bridge receipts are not treated as successful submissions', async () => {
  const f = fixture()
  f.setBridgeStatus('reverted')
  await assert.rejects(f.sdk.doBridge(quote), /bridge transaction reverted/)
})

test('a known bridge hash survives a receipt-lookup failure', async () => {
  const f = fixture()
  f.failBridgeReceipt()
  await assert.rejects(f.sdk.doBridge(quote), {
    code: 'BRIDGE_CONFIRMATION_UNAVAILABLE',
    transactionHash: bridgeHash,
  })
  assert.deepEqual(f.writes.map((request) => request.functionName), ['approve', 'bridgeTo'])
})

test('concurrent submissions cannot overwrite the active fee guard', async () => {
  const f = fixture()
  const first = f.sdk.doBridge(quote)
  await assert.rejects(f.sdk.doBridge({ ...quote, fee: 999n }), /already in progress/)
  await first
  assert.deepEqual(f.writes.map((request) => request.functionName), ['approve', 'bridgeTo'])
})

test('a refreshed quote cannot silently worsen costs or change the transfer', () => {
  assert.doesNotThrow(() => assertReviewedQuote(quote, { ...quote, fee: 90n, amountReceived: 1000n }))
  for (const change of [
    { fee: 101n }, { protocolFee: 2n }, { amountReceived: 998n },
    { amount: 1n }, { targetChainId: 122 }, { protocol: 'LAYERZERO' },
    { target: '0x2222222222222222222222222222222222222222' },
  ]) {
    assert.throws(() => assertReviewedQuote(quote, { ...quote, ...change }), { code: 'BRIDGE_QUOTE_CHANGED' })
  }
})
