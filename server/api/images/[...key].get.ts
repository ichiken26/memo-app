import { createError, getRouterParam, setHeader } from "h3";
export default defineEventHandler(async (event) => {
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
  const object = await env.MEMO_IMAGES.get(key);
  if (!object)
    throw createError({ statusCode: 404, statusMessage: "Image not found" });
  setHeader(
    event,
    "Content-Type",
    object.httpMetadata?.contentType || "application/octet-stream",
  );
  setHeader(
    event,
    "Cache-Control",
    object.httpMetadata?.cacheControl || "public, max-age=3600",
  );
  setHeader(event, "X-Content-Type-Options", "nosniff");
  return object.body;
});
