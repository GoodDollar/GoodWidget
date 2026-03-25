/**
 * GoodWidget Bridge Protocol v1
 *
 * Defines the message envelope used for postMessage-based communication
 * between a host app and an embedded child (iframe or WebView).
 */

export const GW_BRIDGE_VERSION = '1.0.0'
export const GW_BRIDGE_NS = 'gw-bridge' as const

// ── Message types ──────────────────────────────────────────────────

export type BridgeMessageType =
  | 'init'
  | 'init-ack'
  | 'request'
  | 'response'
  | 'event'

// ── Envelope ───────────────────────────────────────────────────────

export interface BridgeEnvelope {
  /** Namespace guard — messages without this are ignored */
  ns: typeof GW_BRIDGE_NS
  /** Protocol version */
  version: string
  /** Message type */
  type: BridgeMessageType
  /** Unique message id (UUID or counter) */
  id: string
  /** Session id established during handshake */
  sessionId?: string
}

// ── Handshake ──────────────────────────────────────────────────────

export interface BridgeInitMessage extends BridgeEnvelope {
  type: 'init'
  /** Application identifier declared by the child */
  appId?: string
  /** Capabilities the child supports */
  capabilities?: ChildCapabilities
}

export interface BridgeInitAckMessage extends BridgeEnvelope {
  type: 'init-ack'
  /** Session id the host assigns */
  sessionId: string
  /** Accounts and chain available at handshake time */
  initialState?: {
    accounts?: string[]
    chainId?: string
  }
}

export interface ChildCapabilities {
  supportsThemeOverrides?: boolean
  supportsTransactions?: boolean
}

// ── RPC request/response ───────────────────────────────────────────

export interface BridgeRequestMessage extends BridgeEnvelope {
  type: 'request'
  method: string
  params?: readonly unknown[] | Record<string, unknown>
}

export interface BridgeResponseMessage extends BridgeEnvelope {
  type: 'response'
  /** Correlates with the request id */
  requestId: string
  result?: unknown
  error?: BridgeRpcError
}

export interface BridgeRpcError {
  code: number
  message: string
  data?: unknown
}

// ── Provider events forwarded from host ────────────────────────────

export interface BridgeEventMessage extends BridgeEnvelope {
  type: 'event'
  event: BridgeProviderEvent
  data: unknown
}

export type BridgeProviderEvent =
  | 'accountsChanged'
  | 'chainChanged'
  | 'connect'
  | 'disconnect'
  | 'message'

// ── Union of all message shapes ────────────────────────────────────

export type BridgeMessage =
  | BridgeInitMessage
  | BridgeInitAckMessage
  | BridgeRequestMessage
  | BridgeResponseMessage
  | BridgeEventMessage

// ── Helpers ────────────────────────────────────────────────────────

let counter = 0
export function generateId(): string {
  return `gw-${Date.now()}-${++counter}`
}

export function isBridgeMessage(data: unknown): data is BridgeMessage {
  if (typeof data !== 'object' || data === null) return false
  const msg = data as Record<string, unknown>
  return msg.ns === GW_BRIDGE_NS && typeof msg.type === 'string' && typeof msg.id === 'string'
}
