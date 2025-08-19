-- Drop the old simple rate limiting table if we're replacing it
-- Keep it for now as fallback, will remove in future migration
-- DROP TABLE IF EXISTS user_rate_limits CASCADE;

-- Create improved rate limiting table with sliding window support
CREATE TABLE IF NOT EXISTS rate_limit_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- Can be user_id, ip_address, api_key, etc.
    bucket TEXT NOT NULL DEFAULT 'default', -- Different buckets for different rate limits
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}' -- Optional metadata for debugging
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_bucket 
    ON rate_limit_requests(identifier, bucket);
CREATE INDEX IF NOT EXISTS idx_rate_limit_requested_at 
    ON rate_limit_requests(requested_at);

-- Create cleanup index for old records
CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup 
    ON rate_limit_requests(requested_at) 
    WHERE requested_at < NOW() - INTERVAL '24 hours';

-- Function to check rate limit using sliding window
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_bucket TEXT,
    p_max_requests INTEGER,
    p_window_ms BIGINT,
    p_now TIMESTAMPTZ,
    p_window_start TIMESTAMPTZ
) 
RETURNS TABLE(allowed BOOLEAN, request_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_count INTEGER;
    v_allowed BOOLEAN;
BEGIN
    -- Count requests in the sliding window
    SELECT COUNT(*)
    INTO v_request_count
    FROM rate_limit_requests
    WHERE identifier = p_identifier
        AND bucket = p_bucket
        AND requested_at >= p_window_start;
    
    -- Check if under limit
    v_allowed := v_request_count < p_max_requests;
    
    -- If allowed, record this request
    IF v_allowed THEN
        INSERT INTO rate_limit_requests (identifier, bucket, requested_at)
        VALUES (p_identifier, p_bucket, p_now);
        
        v_request_count := v_request_count + 1;
    END IF;
    
    RETURN QUERY SELECT v_allowed, v_request_count;
END;
$$;

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete records older than 24 hours
    DELETE FROM rate_limit_requests
    WHERE requested_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Create a scheduled job to clean up old records (if pg_cron is available)
-- This would need to be set up separately in Supabase dashboard or via API
-- Example: SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_old_rate_limit_records();');

-- Grant necessary permissions
GRANT ALL ON rate_limit_requests TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limit_records TO service_role;

-- Add comment for documentation
COMMENT ON TABLE rate_limit_requests IS 'Sliding window rate limiting implementation for scalable API throttling';
COMMENT ON FUNCTION check_rate_limit IS 'Checks and updates rate limit using sliding window algorithm';
COMMENT ON FUNCTION cleanup_old_rate_limit_records IS 'Removes rate limit records older than 24 hours to prevent table bloat';