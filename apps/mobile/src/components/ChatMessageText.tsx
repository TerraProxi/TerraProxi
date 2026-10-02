import { Fragment } from 'react'
import { StyleSheet, Text, type TextStyle, type StyleProp } from 'react-native'

type InlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }

const INLINE_MARKDOWN = /(\*\*(.+?)\*\*|\*(.+?)\*)/g

function parseInlineMarkdown(line: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  let lastIndex = 0

  for (const match of line.matchAll(INLINE_MARKDOWN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ kind: 'text', value: line.slice(lastIndex, index) })
    }
    if (match[2]) {
      segments.push({ kind: 'bold', value: match[2] })
    } else if (match[3]) {
      segments.push({ kind: 'italic', value: match[3] })
    }
    lastIndex = index + match[0].length
  }

  if (lastIndex < line.length) {
    segments.push({ kind: 'text', value: line.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: line }]
}

function isBulletLine(line: string): boolean {
  return /^[-*•]\s+/.test(line.trimStart())
}

function stripBulletPrefix(line: string): string {
  return line.trimStart().replace(/^[-*•]\s+/, '')
}

interface ChatMessageTextProps {
  text: string
  style?: TextStyle
  boldStyle?: TextStyle
  italicStyle?: TextStyle
}

export function ChatMessageText({
  text,
  style,
  boldStyle,
  italicStyle,
}: ChatMessageTextProps) {
  const lines = text.split('\n')

  return (
    <Text style={style}>
      {lines.map((line, lineIndex) => {
        const content = isBulletLine(line) ? stripBulletPrefix(line) : line
        const segments = parseInlineMarkdown(content)
        const isBullet = isBulletLine(line)

        return (
          <Fragment key={`line-${lineIndex}`}>
            {lineIndex > 0 ? '\n' : null}
            {isBullet ? '• ' : null}
            {segments.map((segment, segmentIndex) => (
              <Text
                key={`${lineIndex}-${segmentIndex}`}
                style={segmentStyle(segment, style, boldStyle, italicStyle)}
              >
                {segment.value}
              </Text>
            ))}
          </Fragment>
        )
      })}
    </Text>
  )
}

function segmentStyle(
  segment: InlineSegment,
  base?: TextStyle,
  boldStyle?: TextStyle,
  italicStyle?: TextStyle,
): StyleProp<TextStyle> {
  if (segment.kind === 'bold') {
    return [base, styles.bold, boldStyle]
  }
  if (segment.kind === 'italic') {
    return [base, styles.italic, italicStyle]
  }
  return base
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
})
