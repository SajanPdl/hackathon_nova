-- ADD TELEGRAM ID COLUMN
-- Run in Supabase SQL Editor

ALTER TABLE volunteers_itecpec ADD COLUMN IF NOT EXISTS telegram_id bigint;
ALTER TABLE volunteers_capec ADD COLUMN IF NOT EXISTS telegram_id bigint;

-- OPTIONAL: Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_vol_itecpec_telegram ON volunteers_itecpec(telegram_id);
CREATE INDEX IF NOT EXISTS idx_vol_capec_telegram ON volunteers_capec(telegram_id);
