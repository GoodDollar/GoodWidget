type NativeClipboardModule = {
  setString: (text: string) => void
}

function canUseWebClipboard(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.writeText === 'function'
  )
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  try {
    if (canUseWebClipboard()) {
      await navigator.clipboard.writeText(text)
      return true
    }

    const { default: clipboard } = await import('@react-native-clipboard/clipboard')
    clipboard.setString(text)
    return true
  } catch {
    return false
  }
}
