-- =============================================
-- FIX COMPLETE ACCESS CONTROL (The "Nuclear" Option)
-- Run this in Supabase SQL Editor
-- =============================================

-- Problem: RLS recursion allows infinite loops or fails, and old policies might remain.
-- Solution: Use "Security Definer" functions to check permissions cleanly.

-- 1. Helper Functions (Bypass RLS)
create or replace function check_capec_access()
returns boolean
language plpgsql
security definer -- Runs with privileges of creator (postgres), bypassing RLS
as $$
begin
  return exists (
    select 1 from volunteers_capec 
    where email = auth.email() 
    and role in ('admin', 'super_admin')
  );
end;
$$;

create or replace function check_itec_access()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from volunteers_itecpec 
    where email = auth.email() 
    and role in ('admin', 'super_admin')
  );
end;
$$;

-- 2. Drop ALL/ANY Policies (Clean Slate)
drop policy if exists "Admins All CAPEC Vol" on volunteers_capec;
drop policy if exists "Admins All CAPEC Att" on attendance_capec;
drop policy if exists "Admins All CAPEC Task" on tasks_capec;
drop policy if exists "CAPEC Admin Access Vol" on volunteers_capec;
drop policy if exists "CAPEC Admin Access Att" on attendance_capec;
drop policy if exists "CAPEC Admin Access Task" on tasks_capec;

drop policy if exists "Admins All ITEC Vol" on volunteers_itecpec;
drop policy if exists "Admins All ITEC Att" on attendance_itecpec;
drop policy if exists "Admins All ITEC Task" on tasks_itecpec;
drop policy if exists "ITEC Admin Access Vol" on volunteers_itecpec;
drop policy if exists "ITEC Admin Access Att" on attendance_itecpec;
drop policy if exists "ITEC Admin Access Task" on tasks_itecpec;

-- 3. Apply New Clean Policies

-- CAPEC
create policy "Allow CAPEC Admin" on volunteers_capec
for all to authenticated using ( check_capec_access() );

create policy "Allow CAPEC Admin Att" on attendance_capec
for all to authenticated using ( check_capec_access() );

create policy "Allow CAPEC Admin Task" on tasks_capec
for all to authenticated using ( check_capec_access() );

-- ITEC
create policy "Allow ITEC Admin" on volunteers_itecpec
for all to authenticated using ( check_itec_access() );

create policy "Allow ITEC Admin Att" on attendance_itecpec
for all to authenticated using ( check_itec_access() );

create policy "Allow ITEC Admin Task" on tasks_itecpec
for all to authenticated using ( check_itec_access() );
