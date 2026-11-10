// タスマネ（親ウィンドウ）に埋め込まれたときの postMessage ブリッジ
// - 許可した親オリジンとのみ通信する（event.origin と送信先を必ず固定）
// - 親から受け取るのは Google ID トークン（Firebase へのログイン引き継ぎ）と保存要求だけ

export const DEFAULT_EMBED_PARENT_ORIGINS =
  "https://tasmane.kokage-studio.com,http://localhost:3000,http://localhost:3100";

export type ParentMessage =
  | { type: "auth"; idToken: string; rawNonce?: string }
  | { type: "save-request"; requestId: string };

export type MemoAppMessage =
  | { source: "memo-app"; type: "ready"; signedIn: boolean; email: string | null }
  | { source: "memo-app"; type: "auth-result"; ok: boolean; error?: string }
  | { source: "memo-app"; type: "memo-saved"; memo: { id: string; title: string; url: string }; requestId?: string }
  | { source: "memo-app"; type: "save-skipped"; reason: "empty" | "signed-out" | "failed"; requestId: string };

// 許可オリジン一覧の解析（http/https のオリジンのみ）
export const parseAllowedOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      try {
        const url = new URL(item);
        return url.protocol === "https:" || url.protocol === "http:" ? [url.origin] : [];
      } catch {
        return [];
      }
    });

// 親オリジンの特定（ancestorOrigins → referrer の順。許可外なら null）
export const resolveParentOrigin = (
  ancestorOrigins: readonly string[],
  referrer: string,
  allowed: readonly string[],
): string | null => {
  let candidate = ancestorOrigins[0] ?? "";
  if (!candidate && referrer) {
    try {
      candidate = new URL(referrer).origin;
    } catch {
      return null;
    }
  }
  return candidate && allowed.includes(candidate) ? candidate : null;
};

// 親からのメッセージの検証
export const parseParentMessage = (
  origin: string,
  data: unknown,
  parentOrigin: string,
): ParentMessage | null => {
  if (origin !== parentOrigin || !data || typeof data !== "object") return null;
  const value = data as Record<string, unknown>;
  if (value.source !== "tasmane") return null;
  // 親（タスマネ）でのタスク保存時に、編集中のメモを保存させる
  if (value.type === "save-request") {
    return typeof value.requestId === "string" && value.requestId
      ? { type: "save-request", requestId: value.requestId }
      : null;
  }
  if (value.type !== "auth") return null;
  if (typeof value.idToken !== "string" || !value.idToken) return null;
  if (value.rawNonce !== undefined && typeof value.rawNonce !== "string") return null;
  return {
    type: "auth",
    idToken: value.idToken,
    ...(typeof value.rawNonce === "string" ? { rawNonce: value.rawNonce } : {}),
  };
};

// 埋め込みを許可する CSP（クリックジャッキング対策）
export const frameAncestorsPolicy = (allowed: readonly string[]): string =>
  ["frame-ancestors 'self'", ...allowed].join(" ");
