-- Create table for API rate limiting
CREATE TABLE IF NOT EXISTS user_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_count INTEGER NOT NULL DEFAULT 0,
    last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON user_rate_limits(user_id);

-- Enable RLS
ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own rate limit data" ON user_rate_limits
    FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_rate_limits_updated_at 
    BEFORE UPDATE ON user_rate_limits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions for service role
GRANT ALL ON user_rate_limits TO service_role;