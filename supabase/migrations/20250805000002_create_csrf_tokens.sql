-- Create table for CSRF token storage
CREATE TABLE IF NOT EXISTS csrf_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- Create unique index on user_id for active tokens
CREATE UNIQUE INDEX IF NOT EXISTS idx_csrf_tokens_user_id_active 
ON csrf_tokens(user_id) 
WHERE used = FALSE AND expires_at > NOW();

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON csrf_tokens(expires_at);

-- Enable RLS
ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own CSRF tokens" ON csrf_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions for service role
GRANT ALL ON csrf_tokens TO service_role;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_csrf_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM csrf_tokens 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically clean up expired tokens
-- Run cleanup when new tokens are created
CREATE OR REPLACE FUNCTION trigger_cleanup_csrf_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run cleanup occasionally to avoid performance impact
    IF random() < 0.1 THEN -- 10% chance
        PERFORM cleanup_expired_csrf_tokens();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_csrf_tokens_trigger
    AFTER INSERT ON csrf_tokens
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_csrf_tokens();