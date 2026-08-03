import test from "node:test";
import assert from "node:assert/strict";
import {
  findMediaSpacingWarnings,
  indentMarkdownLines,
  insertMediaNotation,
  mediaNotation,
  parseMemo,
  safeUrl,
  setTaskCheckboxAt,
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
test("red and bold notation works in either nesting order", () => {
  const redOutside = (
    parseMemo("==**important**=={red}")[0] as { content: string }
  ).content;
  assert.match(
    redOutside,
    /<span class="memo-red"><strong>important<\/strong><\/span>/,
  );

  const boldOutside = (
    parseMemo("**==important=={red}**")[0] as { content: string }
  ).content;
  assert.match(
    boldOutside,
    /<strong><span class="memo-red">important<\/span><\/strong>/,
  );
});
test("task list notation supports checked, standard unchecked and compact unchecked items", () => {
  const content = (
    parseMemo("- [x] done\n- [ ] pending\n- [] compact")[0] as {
      content: string;
    }
  ).content;
  assert.match(content, /<input[^>]*checked=""[^>]*type="checkbox"/);
  assert.doesNotMatch(content, /disabled=""/);
  assert.doesNotMatch(content, /id="task-item-/);
  assert.equal((content.match(/type="checkbox"/g) ?? []).length, 3);
  assert.equal((content.match(/checked=""/g) ?? []).length, 1);
  assert.match(content, /pending/);
  assert.match(content, /compact/);
});
test("setTaskCheckboxAt toggles the targeted task item in source markdown", () => {
  const source = "- [ ] one\n- [x] two\n- [] three";
  assert.equal(
    setTaskCheckboxAt(source, 0, true),
    "- [x] one\n- [x] two\n- [] three",
  );
  assert.equal(
    setTaskCheckboxAt(source, 1, false),
    "- [ ] one\n- [ ] two\n- [] three",
  );
  assert.equal(
    setTaskCheckboxAt(source, 2, true),
    "- [ ] one\n- [x] two\n- [x] three",
  );
});
test("task lists retain nested list levels", () => {
  const content = (
    parseMemo("- [ ] parent\n    - [x] child")[0] as { content: string }
  ).content;
  assert.match(
    content,
    /<li class="task-list-item(?: enabled)?">[\s\S]*<ul class="contains-task-list">/,
  );
  assert.equal((content.match(/type="checkbox"/g) ?? []).length, 2);
});
test("Tab indentation indents and Shift+Tab restores selected Markdown lines", () => {
  const source = "- parent\n- child";
  const indented = indentMarkdownLines(source, 9, source.length);
  assert.equal(indented.value, "- parent\n    - child");
  assert.deepEqual(
    indentMarkdownLines(
      indented.value,
      indented.selectionStart,
      indented.selectionEnd,
      true,
    ),
    { value: source, selectionStart: 9, selectionEnd: source.length },
  );
});
test("line-start Backspace outdents one indentation level", () => {
  assert.deepEqual(indentMarkdownLines("        - child", 8, 8, true), {
    value: "    - child",
    selectionStart: 4,
    selectionEnd: 4,
  });
});
test("four manually entered leading spaces equal one Tab indentation", () => {
  const tabIndented = indentMarkdownLines("- child", 0, 7);
  assert.equal(tabIndented.value, "    - child");
  assert.deepEqual(indentMarkdownLines("    - child", 4, 4, true), {
    value: "- child",
    selectionStart: 0,
    selectionEnd: 0,
  });
});
