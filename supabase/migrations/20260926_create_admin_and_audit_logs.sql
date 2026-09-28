-- ========================================================
-- RULEVISION - Supabase Database Schema Extension
-- Admin Panel, Audit Logs & Master Admin Account Seed
-- ========================================================

-- 1. Create Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(64) NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  target_id TEXT,
  target_type VARCHAR(64),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient log auditing
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_email ON admin_audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_logs;

-- Policy: Only Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR (auth.jwt() ->> 'email') IN ('admin@iare.com', 'admin@rulevision.gov.in')
  );

-- Policy: Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR (auth.jwt() ->> 'email') IN ('admin@iare.com', 'admin@rulevision.gov.in')
  );

-- 2. Enhanced RPC Function for Inspector Decision with Audit Logging
CREATE OR REPLACE FUNCTION admin_decide_inspector_request(
  target_user_id UUID,
  new_status VARCHAR(32),
  admin_email TEXT,
  reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role VARCHAR(32);
  updated_row profiles%ROWTYPE;
BEGIN
  -- Verify caller is an admin
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'admin' AND (auth.jwt() ->> 'email') NOT IN ('admin@iare.com', 'admin@rulevision.gov.in') THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can verify inspector requests.';
  END IF;

  -- Prevent self-approval
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Action Denied: You cannot approve or reject your own inspector request.';
  END IF;

  -- Validate new_status
  IF new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be "approved" or "rejected".';
  END IF;

  -- Apply updates to target profile
  IF new_status = 'approved' THEN
    UPDATE profiles
    SET
      role = 'inspector',
      inspector_status = 'approved',
      verified_by = admin_email,
      verified_at = NOW(),
      updated_at = NOW()
    WHERE id = target_user_id
    RETURNING * INTO updated_row;

    -- Insert into audit log
    INSERT INTO admin_audit_logs (action, admin_id, admin_email, target_id, target_type, details)
    VALUES (
      'INSPECTOR_APPROVED',
      auth.uid(),
      admin_email,
      target_user_id::text,
      'inspector',
      jsonb_build_object('inspector_id', updated_row.inspector_id, 'full_name', updated_row.full_name)
    );
  ELSE
    UPDATE profiles
    SET
      role = 'consumer',
      inspector_status = 'rejected',
      verified_by = admin_email,
      verified_at = NOW(),
      updated_at = NOW()
    WHERE id = target_user_id
    RETURNING * INTO updated_row;

    -- Insert into audit log
    INSERT INTO admin_audit_logs (action, admin_id, admin_email, target_id, target_type, details)
    VALUES (
      'INSPECTOR_REJECTED',
      auth.uid(),
      admin_email,
      target_user_id::text,
      'inspector',
      jsonb_build_object('reason', reason, 'full_name', updated_row.full_name)
    );
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', updated_row.id,
    'role', updated_row.role,
    'inspector_status', updated_row.inspector_status,
    'verified_at', updated_row.verified_at
  );
END;
$$;

-- ========================================================
-- 3. SQL SCRIPT TO SEED MASTER ADMIN (admin@iare.com / murali@123)
-- Paste and run the following in your Supabase SQL Editor:
-- ========================================================
/*
-- Step 1: Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Insert into auth.users (if not already existing)
DO $$
DECLARE
  new_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@iare.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      new_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@iare.com',
      crypt('murali@123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"IARE Administrator","role":"admin"}',
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      encode(gen_random_bytes(32), 'hex')
    );
  END IF;

  -- Step 3: Insert / Update in public.profiles with role = 'admin'
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    inspector_status,
    department,
    state,
    district,
    verified_by,
    verified_at,
    created_at,
    updated_at
  )
  SELECT
    id,
    'IARE Administrator',
    'admin@iare.com',
    'admin',
    'approved',
    'Central Legal Metrology & Standards Directorate',
    'Telangana',
    'Hyderabad (IARE Campus)',
    'Master Authority',
    NOW(),
    NOW(),
    NOW()
  FROM auth.users
  WHERE email = 'admin@iare.com'
  ON CONFLICT (id) DO UPDATE
  SET
    role = 'admin',
    inspector_status = 'approved',
    updated_at = NOW();
END $$;
*/
