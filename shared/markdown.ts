export type MemoBlock =
  | { type: 'html'; content: string }
  | { type: 'image'; alt: string; url: string }
  | { type: 'link'; title: string; url: string }

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]!))

export const safeUrl = (value: string) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

const inline = (source: string) => {
  let value = escapeHtml(source)
  value = value.replace(/`([^`]+)`/g, '<code>$1</code>')
  value = value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  value = value.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  value = value.replace(/==([^=]+)==\{red\}/g, '<span class="memo-red">$1</span>')
  value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
    const cleanUrl = safeUrl(url)
    return cleanUrl ? `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label
  })
  return value
}

export const parseMemo = (source: string): MemoBlock[] => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MemoBlock[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'html', content: `<p>${paragraph.map(inline).join('<br>')}</p>` })
    paragraph = []
  }
  for (const line of lines) {
    const media = line.match(/^!\[(img|link)\]\{([^}]*)\}\((https?:\/\/[^\s)]+)\)$/)
    if (media) {
      flush()
      const [, type, label, rawUrl] = media
      const url = safeUrl(rawUrl!)
      if (url) blocks.push(type === 'img' ? { type: 'image', alt: label!, url } : { type: 'link', title: label!, url })
      continue
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flush(); const level = heading[1]!.length
      blocks.push({ type: 'html', content: `<h${level}>${inline(heading[2]!)}</h${level}>` }); continue
    }
    const unordered = line.match(/^[-*+]\s+(.+)$/)
    if (unordered) { flush(); blocks.push({ type: 'html', content: `<ul><li>${inline(unordered[1]!)}</li></ul>` }); continue }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/)
    if (ordered) { flush(); blocks.push({ type: 'html', content: `<ol><li>${inline(ordered[1]!)}</li></ol>` }); continue }
    const quote = line.match(/^>\s?(.+)$/)
    if (quote) { flush(); blocks.push({ type: 'html', content: `<blockquote>${inline(quote[1]!)}</blockquote>` }); continue }
    if (!line.trim()) { flush(); continue }
    paragraph.push(line)
  }
  flush()
  return blocks
}

export const findMediaSpacingWarnings = (source: string) => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  return lines.flatMap((line, index) => {
    if (!/^!\[(?:img|link)\]\{[^}]*\}\(https?:\/\/[^\s)]+\)$/.test(line)) return []
    return (index > 0 && lines[index - 1]!.trim()) || (index < lines.length - 1 && lines[index + 1]!.trim()) ? [index + 1] : []
  })
}

export const mediaNotation = (type: 'img' | 'link', label: string, url: string) =>
  `\n\n![${type}]{${label.replace(/[{}]/g, '')}}(${url})\n\n`
