import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoodWidgetProvider } from '@goodwidget/core'
import type { EIP1193Provider, GoodWidgetThemeOverrides, GoodWidgetConfig } from '@goodwidget/core'
import { getThemeManifest } from '@goodwidget/ui'
import type { ThemeManifest } from '@goodwidget/ui'
import { injectStylesIntoShadow, getResetCSS, syncRuntimeStylesIntoShadow } from './shadowStyles'
import { readCSSOverrides, observeCSSChanges } from './cssPropertyBridge'
import { normalizePropDefs, toKebabCase, toCamelCase, emitEvent } from './bridge'
import type { PropDefinitions } from './bridge'

const getBridgedProperty = Symbol('getBridgedProperty')
const setBridgedProperty = Symbol('setBridgedProperty')

export interface MiniAppElementOptions {
  shadow?: boolean
  props?: PropDefinitions
  events?: string[]
  defaultTheme?: 'light' | 'dark'
  defaultConfig?: GoodWidgetConfig
}

export interface MiniAppElement extends HTMLElement {
  provider: EIP1193Provider | null
  themeOverrides: GoodWidgetThemeOverrides | undefined
  config: GoodWidgetConfig | undefined
  emitEvent(eventName: string, detail?: unknown): void
}

export interface MiniAppElementConstructor {
  new (): MiniAppElement
  readonly prototype: MiniAppElement
  readonly observedAttributes: string[]
  themeManifest: ThemeManifest
}

function deepMergeOverrides(
  a?: GoodWidgetThemeOverrides,
  b?: GoodWidgetThemeOverrides,
): GoodWidgetThemeOverrides | undefined {
  if (!a && !b) return undefined
  if (!a) return b
  if (!b) return a
  const result: GoodWidgetThemeOverrides = {}
  if (a.tokens || b.tokens) {
    result.tokens = { ...a.tokens }
    if (b.tokens) {
      const tokenMap = result.tokens as Record<string, Record<string, string | number>>
      for (const [cat, vals] of Object.entries(b.tokens)) {
        tokenMap[cat] = { ...(tokenMap[cat] ?? {}), ...vals } as Record<string, string | number>
      }
    }
  }
  if (a.themes || b.themes) {
    result.themes = { ...a.themes }
    if (b.themes) {
      for (const [name, vals] of Object.entries(b.themes)) {
        result.themes![name] = { ...(result.themes![name] ?? {}), ...vals }
      }
    }
  }
  return result
}

/**
 * Create a Custom Element class that wraps a React mini app component.
 *
 * The returned class should be registered with customElements.define().
 * It handles Shadow DOM isolation, Tamagui CSS injection, and bridges
 * props/attributes/events between the web platform and React.
 */
export function createMiniAppElement(
  App: React.ComponentType<Record<string, unknown>>,
  options: MiniAppElementOptions = {},
): MiniAppElementConstructor {
  const HTMLElementBase: typeof HTMLElement =
    typeof globalThis !== 'undefined' && 'HTMLElement' in globalThis
      ? (globalThis as { HTMLElement: typeof HTMLElement }).HTMLElement
      : (class {} as typeof HTMLElement)

  const {
    shadow = true,
    props: propDefs = {},
    events = [],
    defaultTheme = 'dark',
    defaultConfig,
  } = options
  const normalizedProps = normalizePropDefs(propDefs)

  const manifest = getThemeManifest()

  class GoodWidgetElement extends HTMLElementBase {
    static themeManifest: ThemeManifest = manifest

    #root: ReactDOM.Root | null = null
    #mountPoint: HTMLElement | null = null
    #shadow: ShadowRoot | null = null
    #provider: EIP1193Provider | null = null
    #themeOverrides: GoodWidgetThemeOverrides | undefined = undefined
    #config: GoodWidgetConfig | undefined = undefined
    #cssOverrides: GoodWidgetThemeOverrides | undefined = undefined
    #disconnectObserver: (() => void) | null = null
    #disconnectStyleSync: (() => void) | null = null
    #extraProps: Record<string, unknown> = {}

    constructor() {
      super()
      const upgradeProperty = (name: string, apply: (value: unknown) => void) => {
        if (!Object.prototype.hasOwnProperty.call(this, name)) return
        const value = (this as unknown as Record<string, unknown>)[name]
        delete (this as unknown as Record<string, unknown>)[name]
        apply(value)
      }

      upgradeProperty('provider', (value) => {
        this.provider = (value as EIP1193Provider | null | undefined) ?? null
      })
      upgradeProperty('themeOverrides', (value) => {
        this.themeOverrides = value as GoodWidgetThemeOverrides | undefined
      })
      upgradeProperty('config', (value) => {
        this.config = value as GoodWidgetConfig | undefined
      })

      for (const [name, definition] of Object.entries(normalizedProps)) {
        if (definition.type !== 'property') continue
        upgradeProperty(name, (value) => {
          this[setBridgedProperty](name, value)
        })
      }
    }

    static get observedAttributes(): string[] {
      return Object.entries(normalizedProps)
        .filter(([, def]) => def.type === 'attribute')
        .map(([name]) => toKebabCase(name))
    }

    get provider(): EIP1193Provider | null {
      return this.#provider
    }

    set provider(value: EIP1193Provider | null) {
      this.#provider = value
      this.#render()
    }

    get themeOverrides(): GoodWidgetThemeOverrides | undefined {
      return this.#themeOverrides
    }

    set themeOverrides(value: GoodWidgetThemeOverrides | undefined) {
      this.#themeOverrides = value
      this.#render()
    }

    get config(): GoodWidgetConfig | undefined {
      return this.#config
    }

    set config(value: GoodWidgetConfig | undefined) {
      this.#config = value
      this.#render()
    }

    connectedCallback() {
      this.#disconnectObserver?.()
      this.#disconnectObserver = null
      this.#disconnectStyleSync?.()
      this.#disconnectStyleSync = null

      if (shadow) {
        this.#shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
        if (!this.#shadow.querySelector('style[data-goodwidget-reset]')) {
          injectStylesIntoShadow(this.#shadow, getResetCSS())
        }
        this.#disconnectStyleSync = syncRuntimeStylesIntoShadow(this.#shadow)
        this.#mountPoint = this.#shadow.querySelector<HTMLElement>('#gw-root')
        if (!this.#mountPoint) {
          this.#mountPoint = document.createElement('div')
          this.#mountPoint.id = 'gw-root'
          this.#shadow.appendChild(this.#mountPoint)
        }
      } else {
        this.#mountPoint = this
      }

      this.#cssOverrides = readCSSOverrides(this, manifest)

      this.#disconnectObserver = observeCSSChanges(this, manifest, (overrides) => {
        this.#cssOverrides = overrides
        this.#render()
      })

      this.#root = ReactDOM.createRoot(this.#mountPoint)
      this.#render()
    }

    disconnectedCallback() {
      this.#disconnectObserver?.()
      this.#disconnectObserver = null
      this.#disconnectStyleSync?.()
      this.#disconnectStyleSync = null
      this.#root?.unmount()
      this.#root = null
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      const propName = toCamelCase(name)
      this.#extraProps[propName] = value
      this.#render()
    }

    emitEvent(eventName: string, detail?: unknown) {
      emitEvent(this, eventName, detail)
    }

    [getBridgedProperty](name: string): unknown {
      return this.#extraProps[name]
    }

    [setBridgedProperty](name: string, value: unknown): void {
      this.#extraProps[name] = value
      this.#render()
    }

    #render() {
      if (!this.#root) return

      const mergedOverrides = deepMergeOverrides(this.#themeOverrides, this.#cssOverrides)

      const appProps: Record<string, unknown> = {
        ...this.#extraProps,
        provider: this.#provider ?? undefined,
        config: this.#config ?? defaultConfig,
        themeOverrides: mergedOverrides,
        defaultTheme,
      }

      for (const eventName of events) {
        const handlerName = `on${eventName
          .split('-')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('')}`
        appProps[handlerName] = (detail: unknown) => {
          this.emitEvent(eventName, detail)
        }
      }

      this.#root.render(
        <GoodWidgetProvider
          provider={this.#provider ?? undefined}
          config={this.#config ?? defaultConfig}
          themeOverrides={mergedOverrides}
          defaultTheme={defaultTheme}
        >
          <App {...appProps} />
        </GoodWidgetProvider>,
      )
    }
  }

  for (const [name, definition] of Object.entries(normalizedProps)) {
    if (definition.type !== 'property' || name in GoodWidgetElement.prototype) continue
    Object.defineProperty(GoodWidgetElement.prototype, name, {
      configurable: true,
      enumerable: true,
      get(this: GoodWidgetElement) {
        return this[getBridgedProperty](name)
      },
      set(this: GoodWidgetElement, value: unknown) {
        this[setBridgedProperty](name, value)
      },
    })
  }

  return GoodWidgetElement
}
