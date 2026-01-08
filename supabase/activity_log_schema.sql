-- Create table for activity log (if it doesn't exist)
create table if not exists activity_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action_type text not null check (action_type in ('create', 'update', 'delete', 'login', 'logout')),
  entity_type text not null default 'announcement',
  entity_id uuid,
  description text not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for faster queries (if they don't exist)
create index if not exists idx_activity_log_created_at on activity_log(created_at desc);
create index if not exists idx_activity_log_user_id on activity_log(user_id);
create index if not exists idx_activity_log_action_type on activity_log(action_type);

-- Set up Row Level Security (RLS)
alter table activity_log enable row level security;

-- Drop existing policies if they exist and recreate them
drop policy if exists "Admins can view all activities" on activity_log;
drop policy if exists "Admins can insert activities" on activity_log;

-- Create policy to allow authenticated users (admins) to read all activities
create policy "Admins can view all activities"
  on activity_log for select
  using ( auth.role() = 'authenticated' );

-- Create policy to allow authenticated users (admins) to insert activities
create policy "Admins can insert activities"
  on activity_log for insert
  with check ( auth.role() = 'authenticated' );

-- Note: We don't allow updates or deletes on activity log for audit trail integrity
