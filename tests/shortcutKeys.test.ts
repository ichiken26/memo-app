import assert from "node:assert/strict";
import test from "node:test";
import { isLetterShortcutKey } from "../shared/shortcutKeys";

test("matches letter shortcuts by code when macOS Option changes key", () => {
  assert.equal(isLetterShortcutKey({ code: "KeyR", key: "®" }, "R"), true);
  assert.equal(isLetterShortcutKey({ code: "KeyP", key: "π" }, "P"), true);
  assert.equal(isLetterShortcutKey({ code: "KeyE", key: "Dead" }, "E"), true);
  assert.equal(isLetterShortcutKey({ code: "KeyS", key: "ß" }, "S"), true);
});

test("does not match a different physical letter key", () => {
  assert.equal(isLetterShortcutKey({ code: "KeyQ", key: "q" }, "R"), false);
});

test("falls back to key for synthetic events without code", () => {
  assert.equal(isLetterShortcutKey({ code: "", key: "r" }, "R"), true);
  assert.equal(isLetterShortcutKey({ code: "", key: "R" }, "R"), true);
});
