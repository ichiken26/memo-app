import { createError, getRouterParam, setHeader } from "h3";
import { requireFirebaseUser } from "../../utils/firebaseAuth";
import { isImageOwnedBy } from "../../utils/memoImages";

export default defineEventHandler(async (event) => {
  const { uid } = await requireFirebaseUser(event);
  const env = event.context.cloudflare?.env as
    { MEMO_IMAGES?: R2Bucket } | undefined;
  if (!env?.MEMO_IMAGES)
    throw createError({
      statusCode: 503,
      statusMessage: "R2 image storage is not configured",
    });
  const raw = getRouterParam(event, "key") || "";
  const key = decodeURIComponent(raw);
  if (!key || key.includes(".."))
    throw createError({ statusCode: 400, statusMessage: "Invalid image key" });
  // 他人の画像は存在自体を明かさないよう 404 で返す
  const notFound = () =>
    createError({ statusCode: 404, statusMessage: "Image not found" });
  if (!isImageOwnedBy(key, uid)) throw notFound();
  const object = await env.MEMO_IMAGES.get(key);
  if (!object) throw notFound();
  // キーのプレフィックスに加え、アップロード時に記録した所有者でも照合する
  const recordedOwner = object.customMetadata?.ownerUid;
  if (recordedOwner && recordedOwner !== uid) throw notFound();
  setHeader(
    event,
    "Content-Type",
    object.httpMetadata?.contentType || "application/octet-stream",
  );
  // 認証付きレスポンスなので共有キャッシュ（CDN・プロキシ）には載せない。
  // 既存オブジェクトに保存済みの "public" な cacheControl は使わない。
  setHeader(event, "Cache-Control", "private, max-age=31536000, immutable");
  setHeader(event, "Vary", "Authorization");
  setHeader(event, "X-Content-Type-Options", "nosniff");
  return object.body;
});
