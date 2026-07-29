import { describe, expect, it } from 'vitest'
import { parseSkillSource } from './parse.js'

describe('parseSkillSource', () => {
  it('lands a leading YAML block on a yaml node, not on content', () => {
    const tree = parseSkillSource('---\nname: research\n---\n\n# Heading\n')

    expect(tree.children[0]).toMatchObject({ type: 'yaml', value: 'name: research' })
    expect(tree.children[1]).toMatchObject({ type: 'heading', depth: 1 })
  })

  it('lands a block comment on an html node', () => {
    const tree = parseSkillSource('<!-- author note -->\n')

    expect(tree.children[0]).toMatchObject({ type: 'html' })
  })

  it('keeps a comment inside a fenced code block as a code node', () => {
    const tree = parseSkillSource('```\n<!-- x -->\n```\n')

    expect(tree.children[0]).toMatchObject({ type: 'code', value: '<!-- x -->' })
  })
})
