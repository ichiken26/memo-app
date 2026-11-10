import { DEFAULT_EMBED_PARENT_ORIGINS, frameAncestorsPolicy, parseAllowedOrigins } from "~~/shared/embedBridge";

// 埋め込みを許可する親オリジンの制限（タスマネ以外からの iframe 埋め込みを拒否）
export default defineEventHandler((event) => {
  if (event.path.startsWith("/api/")) return;
  const configured = String(useRuntimeConfig(event).public.embedParentOrigins || DEFAULT_EMBED_PARENT_ORIGINS);
  setResponseHeader(event, "Content-Security-Policy", frameAncestorsPolicy(parseAllowedOrigins(configured)));
});
