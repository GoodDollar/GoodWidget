const pendingScriptLoads = new Map<string, Promise<void>>()

/** Loads a third-party browser SDK once per page and resolves when it is ready. */
export function loadExternalScript(scriptUrl: string): Promise<void> {
  const pendingLoad = pendingScriptLoads.get(scriptUrl)
  if (pendingLoad) {
    return pendingLoad
  }
  const scriptLoad = new Promise<void>((resolve, reject) => {
    const scriptElement = document.createElement('script')
    scriptElement.src = scriptUrl
    scriptElement.async = true
    scriptElement.onload = () => resolve()
    scriptElement.onerror = () => {
      // Allow a later attempt to retry after a network failure
      pendingScriptLoads.delete(scriptUrl)
      reject(new Error(`Could not load ${scriptUrl}`))
    }
    document.head.appendChild(scriptElement)
  })
  pendingScriptLoads.set(scriptUrl, scriptLoad)
  return scriptLoad
}
