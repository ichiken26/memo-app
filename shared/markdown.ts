import MarkdownIt from "markdown-it";
import katex from "katex";

export type MemoBlock =
  | { type: "html"; content: string }
  | { type: "image"; alt: string; url: string }
  | { type: "link"; title: string; url: string }
  | { type: "mermaid"; content: string };

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
md.validateLink = (url) => safeUrl(url) !== null;

export const safeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

const renderMarkdown = (source: string) => {
  const math: string[] = [];
  const redText: string[] = [];
  const withRedPlaceholders = source.replace(
    /==([^=\n]+)==\{red\}/g,
    (_match, content: string) => {
      const token = `MEMOREDTOKEN${redText.length}END`;
      redText.push(`<span class="memo-red">${md.renderInline(content)}</span>`);
      return token;
    },
  );
  const withPlaceholders = withRedPlaceholders.replace(
    /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g,
    (_match, display, inline) => {
      const expression = display ?? inline;
      const html = katex.renderToString(expression, {
        displayMode: Boolean(display),
        throwOnError: false,
        strict: "ignore",
        trust: false,
      });
      const token = `MEMOMATHTOKEN${math.length}END`;
      math.push(html);
      return token;
    },
  );
  let html = md.render(withPlaceholders);
  math.forEach((value, index) => {
    html = html.replaceAll(`MEMOMATHTOKEN${index}END`, value);
  });
  redText.forEach((value, index) => {
    html = html.replaceAll(`MEMOREDTOKEN${index}END`, value);
  });
  return html;
};

export const parseMemo = (source: string): MemoBlock[] => {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MemoBlock[] = [];
  let markdown: string[] = [];
  const flush = () => {
    if (markdown.some((line) => line.trim())) {
      blocks.push({
        type: "html",
        content: renderMarkdown(markdown.join("\n")),
      });
    }
    markdown = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (/^```mermaid\s*$/.test(line)) {
      flush();
      const diagram: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index]!)) {
        diagram.push(lines[index]!);
        index += 1;
      }
      blocks.push({ type: "mermaid", content: diagram.join("\n") });
      continue;
    }
    const media = line.match(
      /^!\[(img|link)\]\{([^}]*)\}\((https?:\/\/[^\s)]+)\)$/,
    );
    if (media) {
      flush();
      const url = safeUrl(media[3]!);
      if (url) {
        blocks.push(
          media[1] === "img"
            ? { type: "image", alt: media[2]!, url }
            : { type: "link", title: media[2]!, url },
        );
      }
      continue;
    }
    markdown.push(line);
  }
  flush();
  return blocks;
};

export const findMediaSpacingWarnings = (source: string) => {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  return lines.flatMap((line, index) => {
    if (!/^!\[(?:img|link)\]\{[^}]*\}\(https?:\/\/[^\s)]+\)$/.test(line))
      return [];
    return (index > 0 && lines[index - 1]!.trim()) ||
      (index < lines.length - 1 && lines[index + 1]!.trim())
      ? [index + 1]
      : [];
  });
};

export const mediaNotation = (
  type: "img" | "link",
  label: string,
  url: string,
) => `![${type}]{${label.replace(/[{}]/g, "")}}(${url})`;

export const insertMediaNotation = (
  source: string,
  start: number,
  end: number,
  notation: string,
) => {
  const before = source.slice(0, start).replace(/\n*$/, "");
  const after = source.slice(end).replace(/^\n*/, "");
  return `${before}${before ? "\n\n" : ""}${notation}${after ? "\n\n" : ""}${after}`;
};

export const toggleMarkdown = (
  source: string,
  start: number,
  end: number,
  marker: string,
) => {
  const selected = source.slice(start, end);
  const outside =
    start >= marker.length &&
    source.slice(start - marker.length, start) === marker &&
    source.slice(end, end + marker.length) === marker;
  if (outside)
    return {
      value:
        source.slice(0, start - marker.length) +
        selected +
        source.slice(end + marker.length),
      start: start - marker.length,
      end: end - marker.length,
    };
  if (selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(marker.length, -marker.length);
    return {
      value: source.slice(0, start) + inner + source.slice(end),
      start,
      end: start + inner.length,
    };
  }
  const value = selected || "テキスト";
  return {
    value: source.slice(0, start) + marker + value + marker + source.slice(end),
    start: start + marker.length,
    end: start + marker.length + value.length,
  };
};
