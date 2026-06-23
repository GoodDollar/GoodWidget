import { AiCreditsWidgetElement } from './element'

const DEFAULT_TAG_NAME = 'ai-credits-widget'

/**
 * Register the <ai-credits-widget> custom element.
 *
 * Call once at the top of your app or in a <script> tag:
 *   import '@goodwidget/ai-credits-widget/register'
 *
 * Then use in HTML:
 *   <ai-credits-widget></ai-credits-widget>
 *
 * Returns the tag name so you can use it programmatically:
 *   const tag = register()  // 'ai-credits-widget'
 *
 * Or register under a custom tag:
 *   const tag = register('my-ai-credits-widget')
 */
export function register(tagName: string = DEFAULT_TAG_NAME): string {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, AiCreditsWidgetElement)
  }
  return tagName
}

register()
