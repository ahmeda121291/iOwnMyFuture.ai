-- Add IP address and user agent columns for enhanced security tracking
ALTER TABLE csrf_tokens 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update the unique index to allow only one unused token per user
-- This enforces single-token policy for better security
-- Tokens are considered "active" when used = FALSE and expires_at is in the future
DROP INDEX IF EXISTS idx_csrf_tokens_user_id_active;
CREATE UNIQUE INDEX idx_csrf_tokens_user_id_active 
ON csrf_tokens(user_id) 
WHERE used = FALSE AND expires_at > NOW();

-- Add index for IP address lookups
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_ip_address ON csrf_tokens(ip_address);

-- Update cleanup function to be more aggressive
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens()
RETURNS void AS $$
BEGIN
    -- Delete expired tokens
    DELETE FROM csrf_tokens 
    WHERE expires_at < NOW();
    
    -- Delete used tokens older than 1 hour
    DELETE FROM csrf_tokens 
    WHERE used = TRUE AND created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up tokens (if pg_cron is available)
-- This would be set up in Supabase dashboard or via SQL if pg_cron is available
-- SELECT cron.schedule('cleanup-csrf-tokens', '0 * * * *', 'SELECT cleanup_expired_csrf_tokens();');

-- Add comment for documentation
COMMENT ON TABLE csrf_tokens IS 'Stores CSRF tokens with enhanced security tracking including IP address and user agent';
COMMENT ON COLUMN csrf_tokens.token_hash IS 'SHA-256 hash of the actual CSRF token';
COMMENT ON COLUMN csrf_tokens.ip_address IS 'IP address from which the token was generated';
COMMENT ON COLUMN csrf_tokens.user_agent IS 'User agent string from the client that generated the token';