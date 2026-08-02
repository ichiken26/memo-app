import test from "node:test";
import assert from "node:assert/strict";
import {
  findMediaSpacingWarnings,
  insertMediaNotation,
  mediaNotation,
  parseMemo,
  safeUrl,
  toggleMarkdown,
} from "../shared/markdown";
test("unsafe protocols and HTML are not emitted", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.match(
    (parseMemo("<script>x</script>")[0] as { content: string }).content,
    /&lt;script&gt;/,
  );
});
test("custom media blocks are parsed", () => {
  assert.equal(
    parseMemo("![img]{alt}(https://example.com/a.png)")[0]?.type,
    "image",
  );
  assert.equal(
    parseMemo("![link]{site}(https://example.com)")[0]?.type,
    "link",
  );
});
test("spacing warnings identify adjacent content", () => {
  assert.deepEqual(
    findMediaSpacingWarnings("text\n![img]{a}(https://e.test/a.png)"),
    [2],
  );
  assert.deepEqual(
    findMediaSpacingWarnings("\n![img]{a}(https://e.test/a.png)\n"),
    [],
  );
});
test("media insertion normalizes surrounding blank lines", () =>
  assert.equal(
    insertMediaNotation(
      "before\n\n\n\nafter",
      6,
      10,
      mediaNotation("link", "x", "https://e.test"),
    ),
    "before\n\n![link]{x}(https://e.test)\n\nafter",
  ));
test("headings, lists and quotes render safely", () => {
  const result = parseMemo("# title\n\n- item\n\n> quote");
  const content = (result[0] as { content: string }).content;
  assert.match(content, /<h1>/);
  assert.match(content, /<ul>/);
  assert.match(content, /<blockquote>/);
});
test("GFM tables, fenced code, math and Mermaid are supported", () => {
  const result = parseMemo(
    "| A | B |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1\n```\n\n$E=mc^2$\n\n```mermaid\ngraph TD; A-->B\n```",
  );
  const html = result
    .filter((block) => block.type === "html")
    .map((block) => block.content)
    .join("");
  assert.match(html, /<table>/);
  assert.match(html, /language-ts/);
  assert.match(html, /class="katex"/);
  assert.equal(result.at(-1)?.type, "mermaid");
});
test("bold and italic formatting toggle instead of nesting", () => {
  assert.equal(toggleMarkdown("word", 0, 4, "**").value, "**word**");
  assert.equal(toggleMarkdown("**word**", 2, 6, "**").value, "word");
  assert.equal(toggleMarkdown("*word*", 1, 5, "*").value, "word");
});
test("red text notation renders safely and supports inline Markdown", () => {
  const content = (
    parseMemo("==important **bold**=={red}")[0] as { content: string }
  ).content;
  assert.match(
    content,
    /<span class="memo-red">important <strong>bold<\/strong><\/span>/,
  );
  const unsafe = (
    parseMemo("==<img src=x onerror=alert(1)>=={red}")[0] as {
      content: string;
    }
  ).content;
  assert.doesNotMatch(unsafe, /<img/);
  assert.match(unsafe, /&lt;img/);
});
