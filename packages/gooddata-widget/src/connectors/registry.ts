import type { DataConnector, DataConnectorFactory } from './types'

interface ConnectorRegistration<TConfig, TResponse> {
  factory: DataConnectorFactory<TConfig, TResponse>
  config: TConfig
  instance?: DataConnector<TResponse>
}

// Registrations are stored with their config but not yet constructed — the
// connector is only instantiated (and memoized) the first time a dashboard
// actually requests it, so unused data sources never initialize.
const connectorRegistry = new Map<string, ConnectorRegistration<unknown, unknown>>()

export function registerConnectorFactory<TConfig, TResponse>(
  connectorId: string,
  factory: DataConnectorFactory<TConfig, TResponse>,
  config: TConfig,
): void {
  connectorRegistry.set(connectorId, { factory, config } as ConnectorRegistration<unknown, unknown>)
}

export function getConnector<TResponse>(connectorId: string): DataConnector<TResponse> {
  const registration = connectorRegistry.get(connectorId)
  if (!registration) {
    throw new Error(`No data connector registered for id "${connectorId}"`)
  }
  if (!registration.instance) {
    registration.instance = registration.factory(registration.config)
  }
  return registration.instance as DataConnector<TResponse>
}

export function isConnectorRegistered(connectorId: string): boolean {
  return connectorRegistry.has(connectorId)
}

export function listRegisteredConnectorIds(): string[] {
  return Array.from(connectorRegistry.keys())
}
