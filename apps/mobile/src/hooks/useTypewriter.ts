import { useCallback, useEffect, useRef, useState } from 'react'

const TOKEN_PATTERN = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|\n+|\S+\s*)/g

function tokenizeForTypewriter(text: string): string[] {
  return text.match(TOKEN_PATTERN) ?? [text]
}

function delayForToken(token: string, baseMs: number): number {
  if (token.includes('\n')) return baseMs * 4
  if (/[.!?…]$/.test(token.trim())) return baseMs * 3.5
  if (/[:,;]$/.test(token.trim())) return baseMs * 2.2
  if (token.trim().length > 12) return baseMs * 1.4
  return baseMs
}

interface UseTypewriterOptions {
  enabled: boolean
  baseDelayMs?: number
  onComplete?: () => void
  onTick?: () => void
}

export function useTypewriter(
  fullText: string,
  { enabled, baseDelayMs = 42, onComplete, onTick }: UseTypewriterOptions,
) {
  const [visibleText, setVisibleText] = useState(enabled ? '' : fullText)
  const [isComplete, setIsComplete] = useState(!enabled)
  const tokensRef = useRef<string[]>([])
  const indexRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCompleteRef = useRef(onComplete)
  const onTickRef = useRef(onTick)

  onCompleteRef.current = onComplete
  onTickRef.current = onTick

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const finish = useCallback((text: string) => {
    clearTimer()
    setVisibleText(text)
    setIsComplete(true)
    onCompleteRef.current?.()
  }, [clearTimer])

  const skip = useCallback(() => {
    finish(fullText)
  }, [finish, fullText])

  useEffect(() => {
    clearTimer()

    if (!enabled) {
      setVisibleText(fullText)
      setIsComplete(true)
      return
    }

    const tokens = tokenizeForTypewriter(fullText)
    tokensRef.current = tokens
    indexRef.current = 0
    setVisibleText('')
    setIsComplete(false)

    const tick = () => {
      const tokensList = tokensRef.current
      if (indexRef.current >= tokensList.length) {
        finish(fullText)
        return
      }

      const nextIndex = indexRef.current + 1
      indexRef.current = nextIndex
      const nextText = tokensList.slice(0, nextIndex).join('')
      setVisibleText(nextText)
      onTickRef.current?.()

      const lastToken = tokensList[nextIndex - 1] ?? ''
      timeoutRef.current = setTimeout(tick, delayForToken(lastToken, baseDelayMs))
    }

    timeoutRef.current = setTimeout(tick, baseDelayMs)

    return clearTimer
  }, [fullText, enabled, baseDelayMs, clearTimer, finish])

  return { visibleText, isComplete, isTyping: enabled && !isComplete, skip }
}
