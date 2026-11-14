import { createMiniAppElement } from '@goodwidget/embed'
import type React from 'react'
import { PasskeyLoginWidget } from './PasskeyLoginWidget.tsx'

/**
 * Custom Element wrapping the PasskeyLoginWidget React component.
 *
 *   import { createGoogleDriveStorage } from '@goodwidget/passkey-login-widget'
 *   const el = document.querySelector('gw-passkey-login')
 *   el.storage = [createGoogleDriveStorage({ clientId })]   // JS property: holds functions
 *   el.rpId = 'example.org'
 *   el.appName = 'Example'
 *   el.privateKey = '0x…'          // only for the backup flow; JS property, never an attribute
 *   el.addEventListener('login', (event) => event.detail)   // { privateKey, address, isNewAccount }
 *
 * Events: login, backup-complete, skip, error.
 */
export const PasskeyLoginWidgetElement = createMiniAppElement(
  // Required props (storage, rpId, appName) are set by the host as properties, so the loose element prop type is intended
  PasskeyLoginWidget as unknown as React.ComponentType<Record<string, unknown>>,
  {
    shadow: true,
    defaultTheme: 'dark',
    // The private key and the storage adapters are objects/secrets: JS properties only, never HTML attributes
    props: {
      privateKey: 'property',
      storage: 'property',
      themeOverrides: 'property',
      config: 'property',
    },
    events: ['login', 'backup-complete', 'skip', 'error'],
  },
)
