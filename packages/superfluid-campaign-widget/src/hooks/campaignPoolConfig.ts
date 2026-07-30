import type { Address } from 'viem'

export interface CampaignPoolConfig {
  /**
   * GDA pool contract address on Base mainnet (lowercase hex).
   * Null when no on-chain program exists for this campaign yet.
   *
   * To find the address for a campaign:
   * 1. Ask the Superfluid team — they own the admin wallet that created the pool.
   * 2. Query the Superfluid Base subgraph for all SUP pools:
   *      https://base-mainnet.subgraph.x.superfluid.dev/
   *      { pools(where:{ token:"0xa69f80524381275a7ffdb3ae01c54150644c8792" }) { id admin { id } } }
   * 3. Search BaseScan for GDA pool creation events for the SUP token:
   *      https://basescan.org/token/0xa69f80524381275a7ffdb3ae01c54150644c8792
   */
  poolAddress: Address | null
  /**
   * Campaign budget: total SUP tokens allocated for this program (human-readable,
   * not wei). This is a static value set when the campaign is created and only
   * changes if Superfluid updates the program budget.
   */
  totalAllocated: number
}

/**
 * Maps Superfluid campaign IDs (from the Points API) to their on-chain GDA pool
 * config on Base mainnet.
 *
 * The pool address is the only data that requires server-side resolution via
 * claim.superfluid.org/api/programs (CORS-protected). The budget figures are
 * declared by the campaign owner and confirmed in the issue #127 spec.
 *
 * When poolAddress is null, useProgramSupTotals returns null → RewardPoolSection
 * falls back to the pool's static placeholder figures (pool.supDistributed /
 * pool.supTotal from DEFAULT_CAMPAIGN_MOCK_DATA).
 */
export const CAMPAIGN_GDA_POOL_CONFIG: Record<number, CampaignPoolConfig> = {
  /**
   * GoodDollar actions pool (campaign 606, Season 6).
   * Budget: 217,700 SUP. Program registered on Base; address pending confirmation
   * from the Superfluid team once the pool is funded.
   */
  606: {
    poolAddress: null, // TODO: set once confirmed with Superfluid team
    totalAllocated: 217700,
  },
  /**
   * Ecosystem actions pool (campaign 614, Season 6).
   * Budget: 404,300 SUP. No on-chain program registered yet as of Season 6 launch.
   */
  614: {
    poolAddress: null,
    totalAllocated: 404300,
  },
}
