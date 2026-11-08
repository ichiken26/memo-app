import { cleanupOrphanedMemoImages } from "../utils/memoImages";

// wrangler.toml の [triggers] crons で起動され、参照されなくなった R2 画像を掃除する
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("cloudflare:scheduled", async ({ env }) => {
    const { MEMO_IMAGES: bucket, DB: db } = env as {
      MEMO_IMAGES?: R2Bucket;
      DB?: D1Database;
    };
    if (!bucket || !db) {
      console.warn("[memo-images] cleanup skipped: bindings are missing");
      return;
    }
    try {
      const result = await cleanupOrphanedMemoImages(bucket, db);
      console.log("[memo-images] orphan cleanup finished", result);
    } catch (error) {
      console.error("[memo-images] orphan cleanup failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
});
