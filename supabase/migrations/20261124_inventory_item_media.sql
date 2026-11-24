-- =============================================================================
-- Milestone v2.9.0: Inventory Item Media Album & Storage Bucket Migration
-- File: supabase/migrations/20261124_inventory_item_media.sql
-- =============================================================================

-- 1. Add denormalized primary_image_url pointer to public.inventory_catalog
ALTER TABLE public.inventory_catalog
  ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

-- 2. Create public.inventory_item_media album table (max 5 photos enforced by API)
CREATE TABLE IF NOT EXISTS public.inventory_item_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL REFERENCES public.inventory_catalog(item_id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'LOCAL' CHECK (source_type IN ('CAMERA', 'LOCAL', 'GOOGLE_DRIVE')),
  file_size_bytes INTEGER,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create composite ordering index for fast album hydration
CREATE INDEX IF NOT EXISTS idx_inventory_item_media_catalog_order
  ON public.inventory_item_media (catalog_item_id, is_primary DESC, display_order ASC, created_at ASC);

-- 4. Enable Row-Level Security & idempotent read policy
ALTER TABLE public.inventory_item_media ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inventory_item_media'
      AND policyname = 'Allow public read on inventory_item_media'
  ) THEN
    CREATE POLICY "Allow public read on inventory_item_media"
      ON public.inventory_item_media
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- 5. Provision public 'inventory-media' Storage bucket (5 MB limit, WebP/JPEG/PNG)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-media',
  'inventory-media',
  true,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 6. Idempotent public read policy on storage.objects for 'inventory-media'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public read on inventory-media bucket'
  ) THEN
    CREATE POLICY "Allow public read on inventory-media bucket"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'inventory-media');
  END IF;
END $$;
