ALTER TABLE tasks_capec ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE tasks_capec ADD COLUMN IF NOT EXISTS duration_minutes integer;

ALTER TABLE tasks_itecpec ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE tasks_itecpec ADD COLUMN IF NOT EXISTS duration_minutes integer;
