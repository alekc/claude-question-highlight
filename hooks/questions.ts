// Splits an assistant reply's markdown into segments and flags the ones that
// ask the user something: a block led by the marker, or a plain paragraph
// ending in "?", plus the option list that directly follows such a block.

export const MARKER = '❓'

export type Segment = { isQuestion: boolean; text: string }

const blocksOf = (text: string): string[] => {
  const blocks: string[] = []
  let current: string[] = []
  let inFence = false
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (!inFence && line.trim() === '') {
      if (current.length > 0) blocks.push(current.join('\n'))
      current = []
      continue
    }
    current.push(line)
  }
  if (current.length > 0) blocks.push(current.join('\n'))
  return blocks
}

const isList = (block: string): boolean => /^\s*([-*+]|\d+[.)])\s/.test(block)

// Reasoning lines (🧠), headings, fences, quotes and tables never count
// unless they carry the explicit marker.
const asks = (block: string): boolean => {
  const t = block.trim()
  if (t.startsWith(MARKER)) return true
  if (/^(🧠|#|```|~~~|>|\|)/.test(t) || isList(t)) return false
  return /\?[*_`)"']*$/.test(t)
}

export const segmentsOf = (text: string): Segment[] => {
  const out: Segment[] = []
  let prevAsked = false
  for (const block of blocksOf(text)) {
    const isQuestion: boolean = asks(block) || (prevAsked && isList(block))
    const last = out[out.length - 1]
    if (last && last.isQuestion === isQuestion) {
      last.text += '\n\n' + block
    } else {
      out.push({ isQuestion, text: block })
    }
    prevAsked = isQuestion
  }
  return out
}

export const questionsOf = (text: string): string[] =>
  segmentsOf(text)
    .filter(s => s.isQuestion)
    .map(s => s.text)
