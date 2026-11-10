import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
} from "firebase/auth";
import {
  parseAllowedOrigins,
  parseParentMessage,
  resolveParentOrigin,
  type MemoAppMessage,
} from "~~/shared/embedBridge";

// 埋め込み時の親オリジン（許可された親に埋め込まれていない場合は null）
const parentOrigin = () => useState<string | null>("embed-parent-origin", () => null);

// 親ウィンドウへの通知（送信先オリジン固定）
const post = (message: MemoAppMessage) => {
  const origin = parentOrigin().value;
  if (!import.meta.client || !origin || window.parent === window) return;
  window.parent.postMessage(message, origin);
};

// タスマネ埋め込みブリッジの初期化（クライアントで1回）
export const initEmbedBridge = () => {
  if (!import.meta.client || window.parent === window) return;
  const config = useRuntimeConfig();
  const { $firebaseAuth } = useNuxtApp();
  const allowed = parseAllowedOrigins(String(config.public.embedParentOrigins || ""));
  const ancestors = Array.from(window.location.ancestorOrigins ?? []);
  const origin = resolveParentOrigin(ancestors, document.referrer, allowed);
  if (!origin) return;
  parentOrigin().value = origin;
  document.documentElement.dataset.embedded = "true";

  // ログイン状態を親へ通知
  if ($firebaseAuth) {
    onAuthStateChanged($firebaseAuth, (user) =>
      post({ source: "memo-app", type: "ready", signedIn: Boolean(user), email: user?.email ?? null }),
    );
  } else {
    post({ source: "memo-app", type: "ready", signedIn: false, email: null });
  }

  // 親から Google ID トークンを受け取り Firebase にログイン（未ログイン時のみ）
  window.addEventListener("message", async (event) => {
    if (event.source !== window.parent) return;
    const message = parseParentMessage(event.origin, event.data, origin);
    if (!message || !$firebaseAuth) return;
    if ($firebaseAuth.currentUser) {
      post({ source: "memo-app", type: "auth-result", ok: true });
      return;
    }
    try {
      const credential = message.rawNonce
        ? new OAuthProvider("google.com").credential({ idToken: message.idToken, rawNonce: message.rawNonce })
        : GoogleAuthProvider.credential(message.idToken);
      await signInWithCredential($firebaseAuth, credential);
      post({ source: "memo-app", type: "auth-result", ok: true });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      post({ source: "memo-app", type: "auth-result", ok: false, error: code || "sign-in failed" });
    }
  });
};

// メモ保存の通知（埋め込み時のみ）
export const notifyMemoSaved = (memo: { id: string; title: string }) => {
  if (!import.meta.client || !parentOrigin().value) return;
  post({
    source: "memo-app",
    type: "memo-saved",
    memo: {
      id: memo.id,
      title: memo.title.trim() || "無題のメモ",
      url: `${window.location.origin}/memo/${encodeURIComponent(memo.id)}`,
    },
  });
};
