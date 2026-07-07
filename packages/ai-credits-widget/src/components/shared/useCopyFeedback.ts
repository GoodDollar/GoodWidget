import { useState } from 'react'
import { copyTextToClipboard } from '@goodwidget/ui'

export function useCopyFeedback() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    if (!(await copyTextToClipboard(text))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

