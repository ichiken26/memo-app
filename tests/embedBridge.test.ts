import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_EMBED_PARENT_ORIGINS,
  frameAncestorsPolicy,
  parseAllowedOrigins,
  parseParentMessage,
  resolveParentOrigin,
} from "../shared/embedBridge";

test("parses the allowed parent origin list and drops invalid entries", () => {
  assert.deepEqual(
    parseAllowedOrigins(" https://tasmane.kokage-studio.com/ , http://localhost:3000,javascript:x, ,ftp://a"),
    ["https://tasmane.kokage-studio.com", "http://localhost:3000"],
  );
  assert.ok(parseAllowedOrigins("").length === 0);
  assert.ok(DEFAULT_EMBED_PARENT_ORIGINS.includes("https://tasmane.kokage-studio.com"));
});

test("resolves the parent origin only when it is allowed", () => {
  const allowed = ["https://tasmane.kokage-studio.com"];
  assert.equal(resolveParentOrigin(["https://tasmane.kokage-studio.com"], "", allowed), "https://tasmane.kokage-studio.com");
  assert.equal(resolveParentOrigin([], "https://tasmane.kokage-studio.com/tasks/new", allowed), "https://tasmane.kokage-studio.com");
  assert.equal(resolveParentOrigin(["https://evil.example"], "https://tasmane.kokage-studio.com/", allowed), null);
  assert.equal(resolveParentOrigin([], "not a url", allowed), null);
});

test("accepts only well-formed auth messages from the resolved parent", () => {
  const parent = "https://tasmane.kokage-studio.com";
  const message = { source: "tasmane", type: "auth", idToken: "a.b.c", rawNonce: "n" };
  assert.deepEqual(parseParentMessage(parent, message, parent), { type: "auth", idToken: "a.b.c", rawNonce: "n" });
  assert.equal(parseParentMessage("https://evil.example", message, parent), null);
  assert.equal(parseParentMessage(parent, { ...message, idToken: 1 }, parent), null);
  assert.equal(parseParentMessage(parent, { ...message, source: "x" }, parent), null);
  assert.equal(parseParentMessage(parent, "string", parent), null);
});

test("builds a frame-ancestors policy limited to the allowed origins", () => {
  assert.equal(
    frameAncestorsPolicy(["https://tasmane.kokage-studio.com", "http://localhost:3000"]),
    "frame-ancestors 'self' https://tasmane.kokage-studio.com http://localhost:3000",
  );
});
