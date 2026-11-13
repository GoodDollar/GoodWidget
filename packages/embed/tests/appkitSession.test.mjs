import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import React from 'react'
import { renderToString } from 'react-dom/server'

let state
let opens
let switches

mock.module('@reown/appkit/react', {
  namedExports: {
    AppKitProvider: () => null,
    modal: {},
    useAppKit: () => ({
      open: async (options) => {
        opens.push(options.view)
        if (state.openError) throw state.openError
      },
    }),
    useAppKitAccount: () => ({ address: state.address, status: state.status }),
    useAppKitProvider: (namespace) => {
      assert.equal(namespace, 'eip155')
      return { walletProvider: state.provider }
    },
    useAppKitNetwork: () => ({
      chainId: state.chainId,
      approvedCaipNetworkIds: state.approved,
      switchNetwork: async (network) => {
        switches.push(network)
        if (state.switchError) throw state.switchError
      },
    }),
    useDisconnect: () => ({}),
  },
})

const { useAppKitSession, DEFAULT_APPKIT_NETWORKS } = await import('../dist/appkitProvider.js')
const address = '0x1111111111111111111111111111111111111111'
const provider = { request: async () => [] }

function reset(overrides = {}) {
  state = { address, status: 'connected', provider, chainId: '42220', ...overrides }
  opens = []
  switches = []
}

function renderSession(options) {
  let session
  function Harness() {
    session = useAppKitSession(options)
    return null
  }
  renderToString(React.createElement(Harness))
  return session
}

test('preserves restoration, provider gating and disconnected null semantics', () => {
  for (const status of [undefined, 'connecting', 'reconnecting']) {
    reset({ status })
    const session = renderSession()
    assert.equal(session.provider, provider)
    assert.equal(session.addressOverride, undefined)
    assert.equal(session.chainIdOverride, undefined)
  }

  reset({ provider: undefined })
  let session = renderSession()
  assert.equal(session.addressOverride, undefined)
  assert.equal(session.chainIdOverride, undefined)
  session = renderSession({ requireProviderForConnected: false })
  assert.equal(session.addressOverride, address)
  assert.equal(session.chainIdOverride, 42220)

  reset({ status: 'disconnected', address: undefined, provider: undefined, chainId: undefined })
  session = renderSession()
  assert.equal(session.provider, undefined)
  assert.equal(session.addressOverride, null)
  assert.equal(session.chainIdOverride, null)

  reset()
  session = renderSession()
  assert.equal(session.provider, provider)
  assert.equal(session.addressOverride, address)
  assert.equal(session.chainIdOverride, 42220)
})

test('maps unknown, empty and numeric approved chain lists', () => {
  reset()
  assert.equal(renderSession().availableChainIdsOverride, null)
  reset({ approved: [] })
  assert.deepEqual(renderSession().availableChainIdsOverride, [])
  reset({ approved: ['eip155:42220', 'eip155:8453', 'invalid', 'eip155:nope'] })
  assert.deepEqual(renderSession().availableChainIdsOverride, [42220, 8453])
})

test('connect opens the modal and rejects cancellation', async () => {
  reset({ address: undefined })
  await assert.rejects(renderSession().connectOverride(), /wallet_connect_cancelled/)
  assert.deepEqual(opens, ['Connect'])
  reset()
  await renderSession().connectOverride()
  assert.deepEqual(opens, ['Connect'])
})

test('switches configured networks and rejects after manual fallback', async () => {
  reset()
  const defaultNetwork = DEFAULT_APPKIT_NETWORKS[0]
  await renderSession().switchChainOverride(Number(defaultNetwork.id))
  assert.deepEqual(switches, [defaultNetwork])
  assert.deepEqual(opens, [])

  const customNetwork = { id: 98765 }
  reset()
  const session = renderSession({ networks: [customNetwork] })
  await session.switchChainOverride(98765)
  assert.deepEqual(switches, [customNetwork])
  await assert.rejects(session.switchChainOverride(42220), /Select the network/)
  assert.deepEqual(opens, ['Networks'])

  reset({ switchError: new Error('rejected') })
  await assert.rejects(renderSession().switchChainOverride(Number(defaultNetwork.id)), /Select the network/)
  assert.deepEqual(opens, ['Networks'])
})

test('propagates modal errors without claiming a successful switch', async () => {
  const openError = new Error('modal unavailable')
  reset({ openError })
  const session = renderSession()
  await assert.rejects(session.connectOverride(), openError)
  await assert.rejects(session.switchChainOverride(-1), openError)
})
