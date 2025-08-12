-- Create error_logs table for tracking application errors
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  stack TEXT,
  component VARCHAR(100),
  action VARCHAR(200),
  metadata JSONB DEFAULT '{}',
  url TEXT,
  user_agent TEXT,
  severity VARCHAR(20) CHECK (severity IN ('error', 'warning', 'info')) DEFAULT 'error',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_component ON public.error_logs(component);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved);

-- Create RLS policies
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own errors
CREATE POLICY "Users can view their own errors" ON public.error_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own errors
CREATE POLICY "Users can insert their own errors" ON public.error_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admin users can view all errors
CREATE POLICY "Admins can view all errors" ON public.error_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  ));

-- Admin users can update errors (for marking as resolved)
CREATE POLICY "Admins can update errors" ON public.error_logs
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
  ));

-- Create a view for error statistics
CREATE OR REPLACE VIEW public.error_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  severity,
  component,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users
FROM public.error_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), severity, component
ORDER BY date DESC, error_count DESC;

-- Grant access to the view
GRANT SELECT ON public.error_stats TO authenticated;

-- Create function to clean up old error logs
CREATE OR REPLACE FUNCTION public.cleanup_old_error_logs()
RETURNS void AS $$
BEGIN
  -- Delete error logs older than 90 days that are resolved
  DELETE FROM public.error_logs 
  WHERE created_at < NOW() - INTERVAL '90 days' 
  AND resolved = TRUE;
  
  -- Delete info logs older than 30 days
  DELETE FROM public.error_logs 
  WHERE created_at < NOW() - INTERVAL '30 days' 
  AND severity = 'info';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up old logs (requires pg_cron extension)
-- This would be set up in Supabase dashboard or via SQL if pg_cron is available
-- SELECT cron.schedule('cleanup-error-logs', '0 2 * * *', 'SELECT public.cleanup_old_error_logs();');