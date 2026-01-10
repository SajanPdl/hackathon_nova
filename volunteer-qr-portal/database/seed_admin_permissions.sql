-- =============================================
-- SEED ADMIN PERMISSIONS (CORRECTED)
-- Run this in Supabase SQL Editor
-- =============================================

-- We insert Admin Users into the VOLUNTEERS tables.
-- This establishes their "profile" and permissions.

-- 1. CAPEC ADMIN
INSERT INTO volunteers_capec (name, email, role, unique_code)
VALUES 
  ('CAPEC Admin', 'admin.capec@hackathon-nova.com', 'admin', 'ADM-CAPEC-001')
ON CONFLICT (unique_code) DO UPDATE 
SET email = EXCLUDED.email;

-- 2. ITEC-PEC ADMIN
INSERT INTO volunteers_itecpec (name, email, role, unique_code)
VALUES 
  ('ITEC Admin', 'admin.itec@hackathon-nova.com', 'admin', 'ADM-ITEC-001')
ON CONFLICT (unique_code) DO UPDATE 
SET email = EXCLUDED.email;

-- 3. SUPER ADMIN
-- Needs access to BOTH tables.
-- We insert them into BOTH volunteer lists with a 'super_admin' role.

INSERT INTO volunteers_capec (name, email, role, unique_code)
VALUES 
  ('Super Admin', 'super.admin@hackathon-nova.com', 'super_admin', 'ADM-SUPER-001')
ON CONFLICT (unique_code) DO UPDATE 
SET email = EXCLUDED.email;

INSERT INTO volunteers_itecpec (name, email, role, unique_code)
VALUES 
  ('Super Admin', 'super.admin@hackathon-nova.com', 'super_admin', 'ADM-SUPER-001')
ON CONFLICT (unique_code) DO UPDATE 
SET email = EXCLUDED.email;
