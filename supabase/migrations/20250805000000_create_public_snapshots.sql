-- Create public_snapshots table for sharing moodboards
CREATE TABLE IF NOT EXISTS public.public_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  moodboard_id UUID REFERENCES public.moodboards(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  title TEXT,
  description TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX idx_public_snapshots_id ON public.public_snapshots(id);
CREATE INDEX idx_public_snapshots_user_id ON public.public_snapshots(user_id);
CREATE INDEX idx_public_snapshots_created_at ON public.public_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE public.public_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create their own snapshots
CREATE POLICY "Users can create own snapshots" ON public.public_snapshots
  FOR INSERT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can view their own snapshots
CREATE POLICY "Users can view own snapshots" ON public.public_snapshots
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Anyone can view active public snapshots (no auth required)
CREATE POLICY "Anyone can view public snapshots" ON public.public_snapshots
  FOR SELECT TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Policy: Users can update their own snapshots
CREATE POLICY "Users can update own snapshots" ON public.public_snapshots
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own snapshots
CREATE POLICY "Users can delete own snapshots" ON public.public_snapshots
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_snapshot_views(snapshot_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.public_snapshots
  SET views = views + 1
  WHERE id = snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;