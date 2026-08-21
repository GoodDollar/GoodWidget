/**
 * A DataConnector owns the lifecycle of talking to one data source: fetching,
 * validating/normalizing the raw response, and refreshing it on demand.
 * `TResponse` is the connector's normalized output shape.
 */
export interface DataConnector<TResponse> {
  fetch: () => Promise<TResponse>
  refresh: () => Promise<void>
}

/**
 * Connectors are constructed lazily (only when a dashboard that needs them is
 * viewed), so factories receive whatever config the host app threads down
 * rather than reading env vars themselves.
 */
export type DataConnectorFactory<TConfig, TResponse> = (config: TConfig) => DataConnector<TResponse>
