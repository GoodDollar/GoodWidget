import React from 'react'
import { createRoot } from 'react-dom/client'
import { StreamingWidget } from '../src/StreamingWidget'
import { GoodReserveWidget } from '../../goodreserve-widget/src/GoodReserveWidget'

const address = '0x1111111111111111111111111111111111111111'
const calls: string[] = []
let switchResult: 'success' | 'unsupported' | 'rejected' = 'unsupported'

const provider = {
  on() {},
  removeListener() {},
  async request({ method }: { method: string }) {
    calls.push(method)
    if (method === 'eth_accounts') return [address]
    if (method === 'eth_chainId') return '0x1'
    if (method === 'wallet_switchEthereumChain') {
      if (switchResult === 'rejected') throw Object.assign(new Error('Rejected'), { code: 4001 })
      if (switchResult === 'unsupported') throw Object.assign(new Error('Unsupported'), { code: 4200 })
      return null
    }
    return null
  },
}

const rootElement = document.createElement('div')
document.body.replaceChildren(rootElement)
const root = createRoot(rootElement)

function render(widget: 'streaming' | 'reserve', options: {
  hideHeader?: boolean
  addressOverride?: string | null
  chainIdOverride?: number | null
  mockReserve?: boolean
} = {}) {
  const { mockReserve = false, ...widgetOptions } = options
  const props = {
    provider,
    ...widgetOptions,
    connectOverride: async () => { calls.push('connectOverride') },
    switchChainOverride: async (id: number) => { calls.push(`switchOverride:${id}`) },
    availableChainIdsOverride: [42220],
  }
  root.render(widget === 'streaming'
    ? <StreamingWidget {...props} />
    : <GoodReserveWidget {...props} mockState={mockReserve ? { status: 'unsupported_chain', chainId: 1 } : undefined} />)
}

Object.assign(window, {
  widgetTest: {
    render,
    calls,
    setSwitchResult(value: typeof switchResult) { switchResult = value },
    address,
  },
})
