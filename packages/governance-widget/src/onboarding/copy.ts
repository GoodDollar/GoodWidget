import type { GovernanceHouse } from '../types'

export interface HouseCopy {
  title: string
  summary: string
  helper: string
  label: string
  defaultStakeAmount: string
}

export const HOUSE_COPY: Record<GovernanceHouse, HouseCopy> = {
  citizenship: {
    title: 'House of Citizenship',
    summary: 'Represent verified community members and highlight your public governance identity.',
    helper: 'Collect the profile details that describe the member behind the wallet.',
    label: 'Identity',
    defaultStakeAmount: '100 G$',
  },
  alignment: {
    title: 'House of Alignment',
    summary: 'Coordinate aligned projects and explain how your mission creates value for the network.',
    helper: 'Collect project-facing metadata that can later map to the onchain registration shape.',
    label: 'Protocol security',
    defaultStakeAmount: '250 G$',
  },
}

