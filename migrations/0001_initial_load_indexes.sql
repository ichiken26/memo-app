-- Idempotent indexes for owner-scoped keyset paging and tag membership lookups.
CREATE INDEX IF NOT EXISTS idx_memos_owner_order
  ON memos(owner_uid, updated_at DESC, created_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_memo_tags_tag_memo
  ON memo_tags(tag_id, memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_tags_memo_tag
  ON memo_tags(memo_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_owner_name
  ON tags(owner_uid, name);
