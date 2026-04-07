
-- Add avatar_color column
ALTER TABLE public.group_members ADD COLUMN avatar_color text;

-- Backfill existing members with hash-based colors matching current frontend logic
-- Using the same 6-color palette and hash algorithm
WITH color_palette AS (
  SELECT unnest(ARRAY['#3B82F6', '#EC4899', '#10B981', '#F97316', '#8B5CF6', '#14B8A6']) AS color,
         generate_series(0, 5) AS idx
)
UPDATE public.group_members gm
SET avatar_color = (
  SELECT color FROM color_palette
  WHERE idx = abs(('x' || left(md5(gm.id::text), 8))::bit(32)::int) % 6
)
WHERE avatar_color IS NULL;
