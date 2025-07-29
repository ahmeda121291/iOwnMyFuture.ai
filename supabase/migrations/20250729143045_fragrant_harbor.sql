/*
  # Initial Schema for MoodBoard.ai

  1. New Tables
    - `users` (handled by Supabase Auth)
    - `journal_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `entry_date` (date)
      - `content` (text)
      - `ai_summary` (text)
      - `created_at` (timestamp)
    - `moodboards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `board_data` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `social_integrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `service_name` (text)
      - `connected` (boolean)
      - `auth_token` (text, encrypted)
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `stripe_customer_id` (text)
      - `stripe_subscription_id` (text)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  ai_summary text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create moodboards table
CREATE TABLE IF NOT EXISTS moodboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE moodboards ENABLE ROW LEVEL SECURITY;

-- Create social_integrations table
CREATE TABLE IF NOT EXISTS social_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  connected boolean DEFAULT false,
  auth_token text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE social_integrations ENABLE ROW LEVEL SECURITY;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text DEFAULT 'inactive',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal_entries
CREATE POLICY "Users can read own journal entries"
  ON journal_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for moodboards
CREATE POLICY "Users can read own moodboards"
  ON moodboards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own moodboards"
  ON moodboards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moodboards"
  ON moodboards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own moodboards"
  ON moodboards
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for social_integrations
CREATE POLICY "Users can read own social integrations"
  ON social_integrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social integrations"
  ON social_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social integrations"
  ON social_integrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social integrations"
  ON social_integrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for moodboard images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('moodboard-images', 'moodboard-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for moodboard images
CREATE POLICY "Users can upload own moodboard images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'moodboard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own moodboard images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'moodboard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own moodboard images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'moodboard-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own moodboard images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'moodboard-images' AND auth.uid()::text = (storage.foldername(name))[1]);