-- Create table for sponsors
create table if not exists sponsors (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  logo_url text,
  website_url text,
  category text not null check (category in ('title', 'gold', 'silver', 'community', 'media')),
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster queries
create index if not exists idx_sponsors_category on sponsors(category, display_order);
create index if not exists idx_sponsors_active on sponsors(is_active);

-- Set up Row Level Security (RLS)
alter table sponsors enable row level security;

-- Create policy to allow everyone to read active sponsors
create policy "Public sponsors are viewable by everyone"
  on sponsors for select
  using ( is_active = true );

-- Create policy to allow authenticated users (admins) to do everything
create policy "Admins can manage sponsors"
  on sponsors for all
  using ( auth.role() = 'authenticated' )
  with check ( auth.role() = 'authenticated' );

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_sponsors_updated_at
  before update on sponsors
  for each row
  execute function update_updated_at_column();

