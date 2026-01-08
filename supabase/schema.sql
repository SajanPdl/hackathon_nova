-- Create table for announcements
create table announcements (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  type text check (type in ('Important', 'Update', 'Tip', 'General')) default 'General',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_active boolean default true
);

-- Set up Row Level Security (RLS)
alter table announcements enable row level security;

-- Create policy to allow everyone to read active announcements
create policy "Public announcements are viewable by everyone"
  on announcements for select
  using ( is_active = true );

-- Create policy to allow authenticated users (admins) to do everything
create policy "Admins can do everything"
  on announcements for all
  using ( auth.role() = 'authenticated' )
  with check ( auth.role() = 'authenticated' );
