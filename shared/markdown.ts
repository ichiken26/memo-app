import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import katex from "katex";

export type MemoBlock =
  | { type: "html"; content: string }
  | { type: "image"; alt: string; url: string }
  | { type: "link"; title: string; url: string }
  | { type: "mermaid"; content: string };

const MARKDOWN_INDENT = "    ";

export const indentMarkdownLines = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  outdent = false,
) => {
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const selectionEndsAtLineStart =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n";
  const effectiveEnd = selectionEndsAtLineStart ? selectionEnd - 1 : selectionEnd;
  const nextLineBreak = value.indexOf("\n", effectiveEnd);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const selectedLines = value.slice(lineStart, lineEnd);

  if (!outdent) {
    const indented = selectedLines.replace(/^/gm, MARKDOWN_INDENT);
    const lineCount = (selectedLines.match(/^/gm) ?? []).length;
    return {
      value: value.slice(0, lineStart) + indented + value.slice(lineEnd),
      selectionStart: selectionStart + MARKDOWN_INDENT.length,
      selectionEnd: selectionEnd + lineCount * MARKDOWN_INDENT.length,
    };
  }

  let removedBeforeStart = 0;
  let removedTotal = 0;
  const outdented = selectedLines.replace(
    /^( {1,4}|\t)/gm,
    (indentation, offset: number) => {
      const removed = indentation.length;
      if (lineStart + offset < selectionStart) removedBeforeStart += removed;
      removedTotal += removed;
      return "";
    },
  );
  return {
    value: value.slice(0, lineStart) + outdented + value.slice(lineEnd),
    selectionStart: Math.max(lineStart, selectionStart - removedBeforeStart),
    selectionEnd: Math.max(lineStart, selectionEnd - removedTotal),
  };
};

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
md.use(taskLists, { enabled: true, label: false, labelAfter: false });
md.validateLink = (url) => safeUrl(url) !== null;

export const setTaskCheckboxAt = (
  source: string,
  index: number,
  checked: boolean,
) => {
  let count = 0;
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const struck = line.match(
        /^(\s*)\{(\s*[-*+]\s+)\[([ xX]?)\](.*)\}$/,
      );
      const normal = line.match(/^(\s*)(\s*[-*+]\s+)\[([ xX]?)\](.*)$/);
      const match = struck ?? normal;
      if (!match) {
        return line;
      }
      if (count !== index) {
        count += 1;
        return line;
      }
      count += 1;
      const mark = checked ? "x" : " ";
      if (struck) {
        return `${struck[1]}{${struck[2]}[${mark}]${struck[4]}}`;
      }
      return `${normal![1]}${normal![2]}[${mark}]${normal![4]}`;
    })
    .join("\n");
};

export const toggleStrikeListLines = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
) => {
  const normalized = value.replace(/\r\n?/g, "\n");
  const lineStart = normalized.lastIndexOf("\n", selectionStart - 1) + 1;
  const selectionEndsAtLineStart =
    selectionEnd > selectionStart && normalized[selectionEnd - 1] === "\n";
  const effectiveEnd = selectionEndsAtLineStart
    ? selectionEnd - 1
    : selectionEnd;
  const nextLineBreak = normalized.indexOf("\n", effectiveEnd);
  const lineEnd =
    nextLineBreak === -1 ? normalized.length : nextLineBreak;
  const selectedLines = normalized.slice(lineStart, lineEnd);
  const toggled = selectedLines
    .split("\n")
    .map((line) => {
      const struck = line.match(/^(\s*)\{(\s*[-*+].+)\}\s*$/);
      if (struck) {
        return `${struck[1]}${struck[2]}`;
      }
      const list = line.match(/^(\s*)(\s*[-*+].+)\s*$/);
      if (list && !/^\s*[-*+]{3,}\s*$/.test(line)) {
        return `${list[1]}{${list[2]}}`;
      }
      const indent = line.match(/^\s*/)?.[0] ?? "";
      const text = line.trim() || "テキスト";
      return `${indent}{- ${text}}`;
    })
    .join("\n");

  return {
    value:
      normalized.slice(0, lineStart) + toggled + normalized.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + toggled.length,
  };
};

export const toggleStrikeListAt = (source: string, index: number) => {
  let count = 0;
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      // renderMarkdown と同じ行判定に揃え、インデックスずれを防ぐ
      const struck = line.match(
        /^(\s*)\{(\s*[-*+]\s+(?:\[[ xX]?\]\s+)?)(.+)\}\s*$/,
      );
      if (struck) {
        if (count !== index) {
          count += 1;
          return line;
        }
        count += 1;
        return `${struck[1]}${struck[2]}${struck[3]}`;
      }
      if (/^\s*[-*+]{3,}\s*$/.test(line)) {
        return line;
      }
      const normal = line.match(
        /^(\s*)(\s*[-*+]\s+(?:\[[ xX]?\]\s+)?)(.+)\s*$/,
      );
      if (!normal) {
        return line;
      }
      if (count !== index) {
        count += 1;
        return line;
      }
      count += 1;
      return `${normal[1]}{${normal[2]}${normal[3]}}`;
    })
    .join("\n");
};

export const safeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

const renderMarkdown = (source: string, listIndexOffset = 0) => {
  const math: string[] = [];
  const redText: string[] = [];
  const listItems: { struck: boolean }[] = [];
  const normalizedSource = source
    .replace(/^(\s*[-*+]\s+)\[\](?=\s|$)/gm, "$1[ ]")
    .replace(/^(\s*\{[-*+]\s+)\[\](?=\s)/gm, "$1[ ]");

  const withListItemMarkers = normalizedSource
    .split("\n")
    .map((line) => {
      const struck = line.match(
        /^(\s*)\{(\s*[-*+]\s+(?:\[[ xX]?\]\s+)?)(.+)\}\s*$/,
      );
      if (struck) {
        const index = listIndexOffset + listItems.length;
        listItems.push({ struck: true });
        return `${struck[1]}${struck[2]}MEMOLISTSTART${index}ZMEMOSTRIKEMARK${struck[3]}MEMOLISTEND`;
      }
      if (/^\s*[-*+]{3,}\s*$/.test(line)) {
        return line;
      }
      const normal = line.match(
        /^(\s*)(\s*[-*+]\s+(?:\[[ xX]?\]\s+)?)(.+)\s*$/,
      );
      if (normal) {
        const index = listIndexOffset + listItems.length;
        listItems.push({ struck: false });
        return `${normal[1]}${normal[2]}MEMOLISTSTART${index}Z${normal[3]}MEMOLISTEND`;
      }
      return line;
    })
    .join("\n");

  const withRedPlaceholders = withListItemMarkers.replace(
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
  html = html.replace(
    /MEMOLISTSTART(\d+)Z(MEMOSTRIKEMARK)?([\s\S]*?)MEMOLISTEND/g,
    (
      _match,
      index: string,
      strikeMark: string | undefined,
      content: string,
    ) => {
      const localIndex = Number(index) - listIndexOffset;
      const struck = Boolean(strikeMark) || listItems[localIndex]?.struck;
      return `<span class="memo-list-text${struck ? " memo-strike" : ""}" data-list-index="${index}">${content}</span>`;
    },
  );
  return { html, listCount: listItems.length };
};

export const parseMemo = (source: string): MemoBlock[] => {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MemoBlock[] = [];
  let markdown: string[] = [];
  let listIndexOffset = 0;
  const flush = () => {
    if (markdown.some((line) => line.trim())) {
      const { html, listCount } = renderMarkdown(
        markdown.join("\n"),
        listIndexOffset,
      );
      listIndexOffset += listCount;
      blocks.push({
        type: "html",
        content: html,
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
