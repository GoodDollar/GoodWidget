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
 * Resolves to the tag name so you can use it programmatically:
 *   const tag = await register()  // 'ai-credits-widget'
 *
 * Or register under a custom tag:
 *   const tag = await register('my-ai-credits-widget')
 */
export async function register(tagName: string = DEFAULT_TAG_NAME): Promise<string> {
  // Keep the element and its browser-focused React/Tamagui dependency graph
  // out of server evaluation. A static import here would execute that graph
  // before this DOM guard could protect an SSR or package-inspection process.
  if (typeof customElements === 'undefined') return tagName
  if (!customElements.get(tagName)) {
    const { AiCreditsWidgetElement } = await import('./element')
    customElements.define(tagName, AiCreditsWidgetElement)
  }
  return tagName
}

void register()
