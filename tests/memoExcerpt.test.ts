import assert from "node:assert/strict";
import test from "node:test";
import {
  MEMO_EXCERPT_LENGTH,
  MEMO_EXCERPT_LINES,
  createMemoExcerpt,
} from "../shared/memos";

test("keeps line breaks so markdown can be rendered", () => {
  assert.equal(
    createMemoExcerpt("\n\n# 見出し\n\n- a\n- b\n\n\n本文"),
    "# 見出し\n\n- a\n- b\n\n本文",
  );
});

test("limits the number of lines", () => {
  const body = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n");
  assert.equal(createMemoExcerpt(body).split("\n").length, MEMO_EXCERPT_LINES);
});

test("cuts at a line boundary and truncates only an overlong first line", () => {
  const long = "x".repeat(MEMO_EXCERPT_LENGTH + 50);
  assert.equal(createMemoExcerpt(`short\n${long}`), "short");
  assert.equal(createMemoExcerpt(long).length, MEMO_EXCERPT_LENGTH);
});
