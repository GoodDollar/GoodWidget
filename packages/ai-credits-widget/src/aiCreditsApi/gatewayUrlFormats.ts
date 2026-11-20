/** Removes trailing slashes so a format can append a path without doubling them. */
function withoutTrailingSlash(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * How the gateway base URL is written for each family of tools.
 * TODO: confirm with AntSeed — these two formats are assumptions until the gateway docs are checked.
 */
export const GATEWAY_BASE_URL_FORMATS = {
  claudeCode: (baseUrl: string) => withoutTrailingSlash(baseUrl),
  openAiCompatible: (baseUrl: string) => `${withoutTrailingSlash(baseUrl)}/v1`,
} as const

export type GatewayToolFamily = keyof typeof GATEWAY_BASE_URL_FORMATS
