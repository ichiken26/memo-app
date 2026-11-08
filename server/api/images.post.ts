import { createError, getRequestURL, readMultipartFormData } from "h3";
import { requireFirebaseUser } from "../utils/firebaseAuth";

const allowed = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
const hasValidSignature = (type: string, data: Uint8Array) => {
  const hex = Array.from(data.slice(0, 12), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (type === "image/png") return hex.startsWith("89504e470d0a1a0a");
  if (type === "image/jpeg") return hex.startsWith("ffd8ff");
  if (type === "image/gif")
    return hex.startsWith("474946383761") || hex.startsWith("474946383961");
  if (type === "image/webp")
    return hex.startsWith("52494646") && hex.slice(16, 24) === "57454250";
  return false;
};

export default defineEventHandler(async (event) => {
  const { uid: owner } = await requireFirebaseUser(event);
  const env = event.context.cloudflare?.env as
    { MEMO_IMAGES?: R2Bucket } | undefined;
  if (!env?.MEMO_IMAGES)
    throw createError({
      statusCode: 503,
      statusMessage: "R2 image storage is not configured",
    });
  const parts = await readMultipartFormData(event);
  const image = parts?.find((part) => part.name === "image" && part.filename);
  if (!image || !allowed.has(image.type || ""))
    throw createError({
      statusCode: 415,
      statusMessage: "PNG, JPEG, GIF, WebP only",
    });
  if (image.data.byteLength > 10 * 1024 * 1024)
    throw createError({
      statusCode: 413,
      statusMessage: "Image must be 10 MB or smaller",
    });
  if (!hasValidSignature(image.type!, image.data))
    throw createError({
      statusCode: 415,
      statusMessage: "File content does not match its image type",
    });
  const key = `${owner}/${crypto.randomUUID()}.${extensions[image.type!]}`;
  await env.MEMO_IMAGES.put(key, image.data, {
    httpMetadata: {
      contentType: image.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: { ownerUid: owner },
  });
  return {
    url: new URL(
      `/api/images/${encodeURIComponent(key)}`,
      getRequestURL(event).origin,
    ).toString(),
  };
});
