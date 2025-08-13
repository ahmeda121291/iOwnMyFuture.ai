-- Add used_at column to track when tokens are marked as used
ALTER TABLE csrf_tokens 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- Create index for used tokens to improve query performance
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_used_at ON csrf_tokens(used_at) WHERE used = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN csrf_tokens.used_at IS 'Timestamp when the token was marked as used for replay protection';