import type { ReactNode } from 'react'

const INLINE_MARKDOWN = /\*\*(.+?)\*\*|\*(.+?)\*/g
const BULLET_PREFIX = /^\s*[-*•]\s+/

/** **gras** et *italique* rendus en éléments React (jamais de HTML injecté). */
function renderInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  for (const match of line.matchAll(INLINE_MARKDOWN)) {
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(line.slice(lastIndex, index))
    nodes.push(match[1] ? <strong key={index}>{match[1]}</strong> : <em key={index}>{match[2]}</em>)
    lastIndex = index + match[0].length
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex))
  return nodes
}

interface Block {
  kind: 'paragraph' | 'list'
  lines: string[]
}

function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const kind = BULLET_PREFIX.test(line) ? 'list' : 'paragraph'
    const content = line.replace(BULLET_PREFIX, '')
    const last = blocks[blocks.length - 1]
    if (kind === 'list' && last?.kind === 'list') last.lines.push(content)
    else blocks.push({ kind, lines: [content] })
  }
  return blocks
}

/** Mise en forme légère des réponses de l'assistant (paragraphes, listes à puces, gras). */
export function ChatText({ text }: { text: string }) {
  return (
    <>
      {toBlocks(text).map((block, blockIndex) =>
        block.kind === 'list' ? (
          // Les blocs sont dérivés du texte et jamais réordonnés : leur position est une clé stable
          <ul key={blockIndex}>
            {block.lines.map((line, lineIndex) => <li key={lineIndex}>{renderInline(line)}</li>)}
          </ul>
        ) : (
          <p key={blockIndex}>{renderInline(block.lines[0])}</p>
        ),
      )}
    </>
  )
}
