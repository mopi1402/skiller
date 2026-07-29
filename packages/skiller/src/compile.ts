import type { Root } from 'mdast'
import { parseSkillSource } from './parse.js'

/**
 * Strip every author-only comment from a skill source, leaving every other byte
 * as written. Detection runs on the mdast tree, so a `<!-- -->` inside a fenced
 * code block is a `code` node and survives untouched.
 */
export function compile(source: string): string {
  const tree = parseSkillSource(source)
  const removals: Removal[] = []

  for (const node of collectHtmlNodes(tree)) {
    if (!node.value.trimStart().startsWith('<!--')) continue
    // CommonMark ends an HTML block at the end of the line holding `-->`, so the
    // node can carry visible text after the comment. Cut at `-->`, not at its end.
    const close = source.indexOf('-->', node.start)
    if (close === -1 || close + 3 > node.end) continue
    removals.push(computeRemoval(source, node.start, close + 3))
  }

  // Back-to-back comments produce ranges that touch or overlap, and each would
  // insert its own space. Merging first is what collapses a run to ONE space.
  removals.sort((a, b) => a.start - b.start)
  const merged: Removal[] = []
  for (const r of removals) {
    const last = merged.at(-1)
    if (last !== undefined && r.start <= last.end) {
      last.end = Math.max(last.end, r.end)
      if (r.replacement !== '') last.replacement = r.replacement
      continue
    }
    merged.push({ ...r })
  }

  let out = ''
  let cursor = 0
  for (const r of merged) {
    out += source.slice(cursor, r.start) + r.replacement
    cursor = r.end
  }
  return out + source.slice(cursor)
}

interface Removal {
  start: number
  end: number
  replacement: string
}

interface HtmlNode {
  value: string
  start: number
  end: number
}

function collectHtmlNodes(root: Root): HtmlNode[] {
  const result: HtmlNode[] = []
  const stack: unknown[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (node === null || typeof node !== 'object') continue
    const candidate = node as {
      type?: unknown
      value?: unknown
      position?: { start?: { offset?: number }; end?: { offset?: number } }
      children?: unknown
    }
    const start = candidate.position?.start?.offset
    const end = candidate.position?.end?.offset
    if (
      candidate.type === 'html' &&
      typeof candidate.value === 'string' &&
      start != null &&
      end != null
    ) {
      result.push({ value: candidate.value, start, end })
    }
    if (Array.isArray(candidate.children)) {
      for (const child of candidate.children) stack.push(child)
    }
  }
  return result
}

const LEADING_WS = /^[ \t]*/
const TRAILING_WS = /[ \t]*$/

function isBlank(text: string): boolean {
  return /^[ \t]*$/.test(text)
}

function leadingWhitespace(text: string): number {
  return text.length - text.replace(LEADING_WS, '').length
}

function trailingWhitespace(text: string): number {
  return text.length - text.replace(TRAILING_WS, '').length
}

function lineStartOf(source: string, index: number): number {
  return source.lastIndexOf('\n', index - 1) + 1
}

function lineEndOf(source: string, index: number): number {
  const nl = source.indexOf('\n', index)
  return nl === -1 ? source.length : nl
}

/**
 * Turn one comment span into the range to splice out. The four shapes are
 * mutually exclusive, and a comment touching a line boundary leaves no space
 * against that boundary.
 */
function computeRemoval(source: string, start: number, end: number): Removal {
  const lineStart = lineStartOf(source, start)
  const lineEnd = lineEndOf(source, end)
  const before = source.slice(lineStart, start)
  const after = source.slice(end, lineEnd)
  const touchesStart = isBlank(before)
  const touchesEnd = isBlank(after)

  if (touchesStart && touchesEnd) {
    const removeStart = lineStart
    let removeEnd = lineEnd < source.length ? lineEnd + 1 : lineEnd
    // Blank above AND below: take the one below too, so exactly one blank line
    // remains and the file reads as if the comment had never been typed.
    if (removeStart > 0 && removeEnd < source.length) {
      const prevLine = source.slice(lineStartOf(source, removeStart - 1), removeStart - 1)
      const nextLineEnd = lineEndOf(source, removeEnd)
      const nextLine = source.slice(removeEnd, nextLineEnd)
      if (isBlank(prevLine) && isBlank(nextLine)) {
        removeEnd = nextLineEnd < source.length ? nextLineEnd + 1 : nextLineEnd
      }
    }
    return { start: removeStart, end: removeEnd, replacement: '' }
  }

  if (!touchesStart && !touchesEnd) {
    const trailing = trailingWhitespace(before)
    const leading = leadingWhitespace(after)
    return {
      start: start - trailing,
      end: end + leading,
      replacement: trailing > 0 || leading > 0 ? ' ' : '',
    }
  }

  if (touchesStart) {
    return { start: lineStart, end: end + leadingWhitespace(after), replacement: '' }
  }

  return { start: start - trailingWhitespace(before), end: lineEnd, replacement: '' }
}
