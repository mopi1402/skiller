import type { Root } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { frontmatter } from 'micromark-extension-frontmatter'

/**
 * The frontmatter extension is wired in so a leading YAML block lands on a
 * `yaml` node and is never mistaken for content.
 */
export function parseSkillSource(source: string): Root {
  return fromMarkdown(source, {
    extensions: [frontmatter(['yaml'])],
    mdastExtensions: [frontmatterFromMarkdown(['yaml'])],
  })
}
