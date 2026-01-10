-- =============================================
-- SECURE RLS POLICIES (UPDATED & IDEMPOTENT)
-- Run this in Supabase SQL Editor
-- =============================================

-- This script closes the open "Admins All" policies and enforces
-- that only admins listed in the specific volunteer table can access data.

-- 1. DROP OLD POLICIES (Cleanup Legacy)
drop policy if exists "Admins All CAPEC Vol" on volunteers_capec;
drop policy if exists "Admins All CAPEC Att" on attendance_capec;
drop policy if exists "Admins All CAPEC Task" on tasks_capec;

drop policy if exists "Admins All ITEC Vol" on volunteers_itecpec;
drop policy if exists "Admins All ITEC Att" on attendance_itecpec;
drop policy if exists "Admins All ITEC Task" on tasks_itecpec;

-- 2. DROP NEW POLICIES If They Exist (To allow re-running this script)
drop policy if exists "CAPEC Admin Access Vol" on volunteers_capec;
drop policy if exists "CAPEC Admin Access Att" on attendance_capec;
drop policy if exists "CAPEC Admin Access Task" on tasks_capec;

drop policy if exists "ITEC Admin Access Vol" on volunteers_itecpec;
drop policy if exists "ITEC Admin Access Att" on attendance_itecpec;
drop policy if exists "ITEC Admin Access Task" on tasks_itecpec;


-- 3. CREATE NEW SECURE POLICIES

-- ==========================
-- CAPEC POLICIES
-- ==========================
create policy "CAPEC Admin Access Vol" on volunteers_capec
for all to authenticated
using (
  auth.email() in (select email from volunteers_capec where role in ('admin', 'super_admin'))
);

create policy "CAPEC Admin Access Att" on attendance_capec
for all to authenticated
using (
  auth.email() in (select email from volunteers_capec where role in ('admin', 'super_admin'))
);

create policy "CAPEC Admin Access Task" on tasks_capec
for all to authenticated
using (
  auth.email() in (select email from volunteers_capec where role in ('admin', 'super_admin'))
);


-- ==========================
-- ITECPEC POLICIES
-- ==========================
create policy "ITEC Admin Access Vol" on volunteers_itecpec
for all to authenticated
using (
  auth.email() in (select email from volunteers_itecpec where role in ('admin', 'super_admin'))
);

create policy "ITEC Admin Access Att" on attendance_itecpec
for all to authenticated
using (
  auth.email() in (select email from volunteers_itecpec where role in ('admin', 'super_admin'))
);

create policy "ITEC Admin Access Task" on tasks_itecpec
for all to authenticated
using (
  auth.email() in (select email from volunteers_itecpec where role in ('admin', 'super_admin'))
);
