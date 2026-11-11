import React from 'react'
import type { PasskeyProviderId } from '../widgetRuntimeContract.ts'

const LOGO_SIZE_PX = 32

/** Google Drive triangle in the brand colors (official logo geometry, viewBox 87.3 x 78). */
function GoogleDriveLogo() {
  return (
    <svg width={LOGO_SIZE_PX} height={LOGO_SIZE_PX} viewBox="0 0 87.3 78" aria-hidden="true" focusable="false">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47" />
      <path
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
        fill="#ea4335"
      />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  )
}

/** iCloud cloud glyph in Apple's blue. */
function ICloudLogo() {
  return (
    <svg width={LOGO_SIZE_PX} height={LOGO_SIZE_PX} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#3693f5" />
    </svg>
  )
}

const LOGO_BY_PROVIDER_ID: Record<PasskeyProviderId, () => React.JSX.Element> = {
  'google-drive': GoogleDriveLogo,
  icloud: ICloudLogo,
}

/** Brand logo of a backup provider, decorative (the provider name is always printed next to it). */
export function ProviderLogo({ providerId }: { providerId: PasskeyProviderId }) {
  const Logo = LOGO_BY_PROVIDER_ID[providerId]
  return <Logo />
}
