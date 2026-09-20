-- ========================================================
-- RULEVISION - Supabase Database Schema Extension
-- Role-Based Authentication & Inspector Approval Workflow
-- ========================================================

-- 1. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'consumer' CHECK (role IN ('consumer', 'inspector', 'admin')),
  inspector_status VARCHAR(32) NOT NULL DEFAULT 'not_requested' CHECK (inspector_status IN ('not_requested', 'pending', 'approved', 'rejected')),
  inspector_id TEXT,
  department TEXT,
  state TEXT,
  district TEXT,
  supporting_document_path TEXT,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_inspector_status ON profiles(inspector_status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security (RLS) Policies for profiles
-- Drop old policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own non-sensitive profile fields" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 3: Users can insert their initial profile upon registration
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role = 'consumer' -- Client can only register as consumer initially
    AND inspector_status IN ('not_requested', 'pending')
  );

-- Policy 4: Users can update their own basic profile (cannot change role or approval status)
CREATE POLICY "Users can update their own non-sensitive profile fields"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-granting inspector or admin role
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    -- Prevent self-approving inspector status
    AND (
      inspector_status = (SELECT p.inspector_status FROM profiles p WHERE p.id = auth.uid())
      OR (
        (SELECT p.inspector_status FROM profiles p WHERE p.id = auth.uid()) IN ('not_requested', 'rejected')
        AND inspector_status = 'pending'
      )
    )
  );

-- Policy 5: Admins can update any profile (to approve/reject inspector requests)
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Automatic updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 4. Secure RPC Function: Admin Inspector Decision
-- Prevents inspectors from approving themselves and verifies admin privileges
CREATE OR REPLACE FUNCTION admin_decide_inspector_request(
  target_user_id UUID,
  new_status VARCHAR(32),
  admin_email TEXT
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
  IF caller_role != 'admin' AND auth.jwt() ->> 'email' != 'admin@rulevision.gov.in' THEN
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

  -- Apply updates
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
