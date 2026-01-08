-- 1. Add columns for file attachments
ALTER TABLE announcements 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_type TEXT;

-- 2. Enable Storage (if not already acting on existing 'storage' schema)
-- Note: You must manually create a bucket named 'announcements' in the Supabase Storage UI first!
-- Go to Storage -> New Bucket -> Name: 'announcements' -> Public: ON

-- 3. Set up Storage Policies for 'announcements' bucket

-- Allow public read access to the 'announcements' bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'announcements' );

-- Allow authenticated users to upload files
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'announcements' and auth.role() = 'authenticated' );

-- Allow authenticated users to update their files
create policy "Authenticated Update"
  on storage.objects for update
  with check ( bucket_id = 'announcements' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete files
create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'announcements' and auth.role() = 'authenticated' );
