/**
 * Markdown helpers for node text.
 *
 * Node text is stored as Markdown. Display and layout need a plain-text view
 * so Markdown syntax characters are not measured as if they were visible and
 * empty formatting (e.g. `**`) still falls back to the placeholder.
 *
 * This only needs to understand the inline Markdown the node editor produces
 * plus common block prefixes typed by hand. It is deliberately layout-only:
 * rendering uses react-markdown.
 */

const ESCAPABLE = /\\([\\`*_{}[\]()#+\-.!~>|])/g

/**
 * Replace code spans and backslash escapes with placeholders so the inline
 * patterns cannot reinterpret them. The placeholders are restored after block
 * prefixes are stripped, so `\#` does not turn into a heading.
 */
function protectInline(text: string): { text: string; restore: (value: string) => string } {
  const codeSpans: string[] = []
  const escapes: string[] = []

  let next = text.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    codeSpans.push(code)
    return `\u0000C${codeSpans.length - 1}\u0000`
  })
  next = next.replace(ESCAPABLE, (_match, char: string) => {
    escapes.push(char)
    return `\u0000E${escapes.length - 1}\u0000`
  })

  return {
    text: next,
    restore: (value) =>
      value
        .replace(/\u0000E(\d+)\u0000/g, (_match, index: string) => escapes[Number(index)] ?? '')
        .replace(/\u0000C(\d+)\u0000/g, (_match, index: string) => codeSpans[Number(index)] ?? '')
  }
}

function stripInline(text: string): string {
  return (
    text
      // Images first: keep the alt text.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Links: keep the label.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Autolinks.
      .replace(/<(https?:\/\/[^>\s]+)>/g, '$1')
      // Strikethrough and bold/italic.
      .replace(/~~([^~\n]+)~~/g, '$1')
      .replace(/\*\*\*([^*\n]+)\*\*\*/g, '$1')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/___([^_\n]+)___/g, '$1')
      .replace(/__([^_\n]+)__/g, '$1')
      // Underscore emphasis only at word boundaries, so snake_case survives.
      .replace(/(^|[^\w])_([^_\n]+)_(?=[^\w]|$)/g, '$1$2')
  )
}

function stripBlockPrefix(line: string): string {
  return line
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s{0,3}>\s?/, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/^\s{0,3}\[[ xX]\]\s+/, '')
    .replace(/^\s{0,3}(?:[-*_])(?:\s*[-*_]){2,}\s*$/, '')
}

export function markdownToPlainText(markdown: string): string {
  let text = markdown.replace(/\r\n?/g, '\n')

  // Fenced code: keep the code, drop the fences and info string.
  text = text.replace(/^```[^\n]*\n([\s\S]*?)\n```\s*$/gm, '$1')

  // Hard breaks before other inline handling.
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/ {2,}\n/g, '\n')
  text = text.replace(/\\\n/g, '\n')

  const protectedInline = protectInline(text)
  text = stripInline(protectedInline.text)

  text = text
    .split('\n')
    .map(stripBlockPrefix)
    .join('\n')

  // Raw HTML is not rendered, so do not measure it either.
  text = text.replace(/<[^>]+>/g, '')

  text = protectedInline.restore(text)

  return (
    text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  )
}

export function hasVisibleMarkdown(markdown: string): boolean {
  return markdownToPlainText(markdown).trim().length > 0
}
