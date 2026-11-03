import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildTransactions, resolvePendingStatuses } from '../src/adapter/historyTransactions.ts'

const hash = (digit) => `0x${digit.repeat(64)}`
const request = (chainId, digit) => ({
  chainId,
  transactionHash: hash(digit),
  timestamp: 100,
  args: { bridge: 'LAYERZERO', id: 1n, targetChainId: 42220, amount: 100n },
})

test('status failure retains the request as pending and does not erase other chains', async () => {
  const sdk = {
    async getTransactionStatus(txHash) {
      if (txHash === hash('1')) throw new Error('explorer unavailable')
      return { status: 'completed', srcTxHash: txHash }
    },
  }
  const result = await buildTransactions(sdk, [request(122, '1'), request(1, '2')])
  assert.equal(result.transactions.length, 2)
  assert.equal(result.isPartial, true)
  assert.equal(result.transactions.find((tx) => tx.fromChainId === 122).status.status, 'pending')
  assert.equal(result.transactions.find((tx) => tx.fromChainId === 1).status.status, 'completed')
})

test('pending polling checks only unresolved entries and retains failures', async () => {
  const pending = { hash: hash('3'), protocol: 'LAYERZERO', status: { status: 'pending' } }
  const completed = { hash: hash('4'), protocol: 'AXELAR', status: { status: 'completed' } }
  const calls = []
  const failing = await resolvePendingStatuses({
    async getTransactionStatus(txHash) {
      calls.push(txHash)
      throw new Error('temporary failure')
    },
  }, [pending, completed])
  assert.deepEqual(calls, [pending.hash])
  assert.equal(failing.isPartial, true)
  assert.equal(failing.transactions[0].status.status, 'pending')
  assert.equal(failing.transactions[1].status.status, 'completed')

  const settled = await resolvePendingStatuses({
    async getTransactionStatus(txHash) {
      return { status: 'completed', srcTxHash: txHash }
    },
  }, failing.transactions)
  assert.equal(settled.isPartial, false)
  assert.equal(settled.transactions[0].status.status, 'completed')
})

test('request and executed legs on the same source chain form one completed entry', async () => {
  const source = request(122, '5')
  const executed = {
    chainId: 42220,
    transactionHash: hash('6'),
    timestamp: 101,
    args: { bridge: 'LAYERZERO', id: 1n, sourceChainId: 122, amount: 100n },
  }
  const result = await buildTransactions({
    async getTransactionStatus() {
      throw new Error('completed transfers need no explorer lookup')
    },
  }, [source, executed])
  assert.equal(result.isPartial, false)
  assert.equal(result.transactions.length, 1)
  assert.equal(result.transactions[0].status.status, 'completed')
  assert.equal(result.transactions[0].status.dstTxHash, executed.transactionHash)
})
