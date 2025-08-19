-- Create oauth_states table for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL UNIQUE,
  service text NOT NULL,
  redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enable RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS policies for oauth_states
CREATE POLICY "Users can view their own OAuth states" ON oauth_states
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OAuth states" ON oauth_states
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth states" ON oauth_states
  FOR DELETE USING (auth.uid() = user_id);

-- Create social_share_logs table
CREATE TABLE IF NOT EXISTS social_share_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service text NOT NULL,
  message text NOT NULL,
  image_url text,
  shared_at timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  error_message text
);

-- Add indexes
CREATE INDEX idx_social_share_logs_user_id ON social_share_logs(user_id);
CREATE INDEX idx_social_share_logs_shared_at ON social_share_logs(shared_at DESC);

-- Enable RLS
ALTER TABLE social_share_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for social_share_logs
CREATE POLICY "Users can view their own share logs" ON social_share_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own share logs" ON social_share_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update social_integrations table to include more fields
ALTER TABLE social_integrations 
  ADD COLUMN IF NOT EXISTS service_user_id text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS permissions text[],
  ADD COLUMN IF NOT EXISTS profile_data jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add unique constraint for user_id and service_name
ALTER TABLE social_integrations 
  ADD CONSTRAINT unique_user_service UNIQUE (user_id, service_name);

-- Update the service_name to support gmail
ALTER TABLE social_integrations 
  DROP CONSTRAINT IF EXISTS social_integrations_service_name_check;

-- Add new constraint that includes gmail
ALTER TABLE social_integrations 
  ADD CONSTRAINT social_integrations_service_name_check 
  CHECK (service_name IN ('facebook', 'instagram', 'twitter', 'linkedin', 'pinterest', 'gmail'));

-- Function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < now();
END;
$$;

-- Optional: Create a scheduled job to clean up expired states (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-oauth-states', '*/10 * * * *', 'SELECT cleanup_expired_oauth_states();');