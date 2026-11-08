const IMAGE_NOTATION_RE = /!\[img\]\{[^}]*\}\((https?:\/\/[^\s)]+)\)/g;
const IMAGE_ROUTE_PREFIX = "/api/images/";
const R2_IMAGE_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpe?g|gif|webp)$/i;

export const extractOwnedMemoImageKeys = (body: string, ownerUid: string) => {
  const keys = new Set<string>();

  for (const match of body.matchAll(IMAGE_NOTATION_RE)) {
    try {
      const pathname = new URL(match[1]!).pathname;
      if (!pathname.startsWith(IMAGE_ROUTE_PREFIX)) continue;

      const key = decodeURIComponent(pathname.slice(IMAGE_ROUTE_PREFIX.length));
      const ownerPrefix = `${ownerUid}/`;
      if (!key.startsWith(ownerPrefix)) continue;

      const imageName = key.slice(ownerPrefix.length);
      if (R2_IMAGE_NAME_RE.test(imageName)) keys.add(key);
    } catch {
      // Ignore malformed or unrelated URLs in memo text.
    }
  }

  return keys;
};

export const deleteRemovedMemoImages = async (
  bucket: R2Bucket | undefined,
  ownerUid: string,
  previousBody: string,
  nextBody: string,
) => {
  if (!bucket) return;

  const previousKeys = extractOwnedMemoImageKeys(previousBody, ownerUid);
  const nextKeys = extractOwnedMemoImageKeys(nextBody, ownerUid);
  const removedKeys = [...previousKeys].filter((key) => !nextKeys.has(key));

  if (removedKeys.length) await bucket.delete(removedKeys);
};
