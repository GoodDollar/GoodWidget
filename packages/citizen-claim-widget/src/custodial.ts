import type {
  CitizenClaimWidgetClientsByChain,
  CitizenClaimWidgetCustodialExecution,
} from './widgetRuntimeContract'

/**
 * Small convenience helper for integrators that already create one client pair
 * per chain. The clients remain owned by the wallet; this only adds the explicit
 * execution-mode marker consumed by CitizenClaimWidget.
 */
export function createCitizenClaimWidgetCustodialExecution(
  clientsByChain: CitizenClaimWidgetClientsByChain,
): CitizenClaimWidgetCustodialExecution {
  return {
    mode: 'custodial',
    clientsByChain,
  }
}
