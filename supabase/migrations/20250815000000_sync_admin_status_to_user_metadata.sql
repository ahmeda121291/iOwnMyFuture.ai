-- Migration: Sync admin status to user metadata
-- Purpose: Automatically update auth.users.user_metadata.is_admin when user_profiles.is_admin changes
-- This eliminates the need for the get-admin-status edge function and prevents CORS issues

-- Create a function to sync admin status to user metadata
CREATE OR REPLACE FUNCTION sync_admin_status_to_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's metadata in auth.users table
  UPDATE auth.users
  SET 
    raw_user_meta_data = 
      CASE 
        WHEN NEW.is_admin = true THEN
          raw_user_meta_data || jsonb_build_object('is_admin', true)
        ELSE
          raw_user_meta_data - 'is_admin'
      END,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that fires when user_profiles.is_admin changes
DROP TRIGGER IF EXISTS sync_admin_status_trigger ON user_profiles;
CREATE TRIGGER sync_admin_status_trigger
  AFTER INSERT OR UPDATE OF is_admin ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_status_to_user_metadata();

-- Also create a function to initialize admin status on user creation
CREATE OR REPLACE FUNCTION initialize_user_admin_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user (make them admin)
  IF (SELECT COUNT(*) FROM user_profiles) = 0 THEN
    -- First user becomes admin
    NEW.is_admin := true;
    
    -- Update their metadata
    UPDATE auth.users
    SET 
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object('is_admin', true),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for initializing first user as admin
DROP TRIGGER IF EXISTS initialize_admin_trigger ON user_profiles;
CREATE TRIGGER initialize_admin_trigger
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_admin_status();

-- Sync existing admin users to have the correct metadata
DO $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Loop through all admin users and update their metadata
  FOR admin_user IN 
    SELECT id FROM user_profiles WHERE is_admin = true
  LOOP
    UPDATE auth.users
    SET 
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object('is_admin', true),
      updated_at = NOW()
    WHERE id = admin_user.id;
  END LOOP;
  
  -- Remove is_admin from non-admin users' metadata
  UPDATE auth.users
  SET 
    raw_user_meta_data = raw_user_meta_data - 'is_admin',
    updated_at = NOW()
  WHERE 
    id IN (SELECT id FROM user_profiles WHERE is_admin = false OR is_admin IS NULL)
    AND raw_user_meta_data ? 'is_admin';
END $$;

-- Add comment explaining the system
COMMENT ON FUNCTION sync_admin_status_to_user_metadata() IS 
'Automatically syncs user_profiles.is_admin to auth.users.user_metadata.is_admin for faster client-side admin checks';

COMMENT ON TRIGGER sync_admin_status_trigger ON user_profiles IS 
'Keeps auth.users.user_metadata.is_admin in sync with user_profiles.is_admin';