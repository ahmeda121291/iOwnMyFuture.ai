-- Create user_activity table for tracking all user actions
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('journal_entry', 'moodboard', 'goal', 'milestone', 'subscription', 'profile', 'snapshot')),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'completed', 'shared', 'upgraded', 'downgraded')),
  reference_id UUID,
  title TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX idx_user_activity_type ON user_activity(type);
CREATE INDEX idx_user_activity_reference_id ON user_activity(reference_id);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity" ON user_activity
  FOR INSERT WITH CHECK (true);

-- Function to log activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_type TEXT,
  p_action TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO user_activity (user_id, type, action, reference_id, title, description, metadata)
  VALUES (p_user_id, p_type, p_action, p_reference_id, p_title, p_description, p_metadata)
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- Trigger function for journal entries
CREATE OR REPLACE FUNCTION track_journal_entry_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_title := 'New journal entry';
    v_description := SUBSTRING(NEW.content FROM 1 FOR 100);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_title := 'Updated journal entry';
    v_description := SUBSTRING(NEW.content FROM 1 FOR 100);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_title := 'Deleted journal entry';
    v_description := SUBSTRING(OLD.content FROM 1 FOR 100);
  END IF;

  PERFORM log_user_activity(
    COALESCE(NEW.user_id, OLD.user_id),
    'journal_entry',
    v_action,
    COALESCE(NEW.id, OLD.id),
    v_title,
    v_description,
    jsonb_build_object(
      'entry_date', COALESCE(NEW.entry_date, OLD.entry_date),
      'mood', COALESCE(NEW.mood, OLD.mood),
      'category', COALESCE(NEW.category, OLD.category),
      'tags', COALESCE(NEW.tags, OLD.tags)
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for journal entries
CREATE TRIGGER journal_entry_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION track_journal_entry_activity();

-- Trigger function for moodboards
CREATE OR REPLACE FUNCTION track_moodboard_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_title := COALESCE(NEW.title, 'New moodboard');
    v_description := NEW.description;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_title := COALESCE(NEW.title, 'Updated moodboard');
    v_description := NEW.description;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_title := COALESCE(OLD.title, 'Deleted moodboard');
    v_description := OLD.description;
  END IF;

  PERFORM log_user_activity(
    COALESCE(NEW.user_id, OLD.user_id),
    'moodboard',
    v_action,
    COALESCE(NEW.id, OLD.id),
    v_title,
    v_description,
    jsonb_build_object(
      'is_public', COALESCE(NEW.is_public, OLD.is_public)
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for moodboards
CREATE TRIGGER moodboard_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON moodboards
FOR EACH ROW
EXECUTE FUNCTION track_moodboard_activity();

-- Trigger function for goals
CREATE OR REPLACE FUNCTION track_goal_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_title := 'New goal: ' || NEW.title;
    v_description := NEW.description;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      v_action := 'completed';
      v_title := 'Completed goal: ' || NEW.title;
    ELSE
      v_action := 'updated';
      v_title := 'Updated goal: ' || NEW.title;
    END IF;
    v_description := NEW.description;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_title := 'Deleted goal: ' || OLD.title;
    v_description := OLD.description;
  END IF;

  PERFORM log_user_activity(
    COALESCE(NEW.user_id, OLD.user_id),
    'goal',
    v_action,
    COALESCE(NEW.id, OLD.id),
    v_title,
    v_description,
    jsonb_build_object(
      'status', COALESCE(NEW.status, OLD.status),
      'priority', COALESCE(NEW.priority, OLD.priority),
      'category', COALESCE(NEW.category, OLD.category),
      'target_date', COALESCE(NEW.target_date, OLD.target_date),
      'progress', COALESCE(NEW.progress, OLD.progress)
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for goals
CREATE TRIGGER goal_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON goals
FOR EACH ROW
EXECUTE FUNCTION track_goal_activity();

-- Trigger function for goal milestones
CREATE OR REPLACE FUNCTION track_milestone_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_title TEXT;
  v_description TEXT;
  v_goal_title TEXT;
BEGIN
  -- Get user_id from the parent goal
  SELECT user_id, title INTO v_user_id, v_goal_title
  FROM goals
  WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_title := 'New milestone: ' || NEW.title;
    v_description := 'For goal: ' || v_goal_title;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.completed = false AND NEW.completed = true THEN
      v_action := 'completed';
      v_title := 'Completed milestone: ' || NEW.title;
    ELSE
      v_action := 'updated';
      v_title := 'Updated milestone: ' || NEW.title;
    END IF;
    v_description := 'For goal: ' || v_goal_title;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_title := 'Deleted milestone: ' || OLD.title;
    v_description := 'For goal: ' || v_goal_title;
  END IF;

  PERFORM log_user_activity(
    v_user_id,
    'milestone',
    v_action,
    COALESCE(NEW.id, OLD.id),
    v_title,
    v_description,
    jsonb_build_object(
      'goal_id', COALESCE(NEW.goal_id, OLD.goal_id),
      'completed', COALESCE(NEW.completed, OLD.completed),
      'target_date', COALESCE(NEW.target_date, OLD.target_date)
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for goal milestones
CREATE TRIGGER milestone_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON goal_milestones
FOR EACH ROW
EXECUTE FUNCTION track_milestone_activity();

-- Trigger function for subscription changes
CREATE OR REPLACE FUNCTION track_subscription_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_title := 'Started subscription';
    v_description := 'Plan: ' || COALESCE(NEW.price_id, 'Free');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'active' THEN
        v_action := 'upgraded';
        v_title := 'Subscription activated';
      ELSIF NEW.status IN ('canceled', 'past_due') THEN
        v_action := 'downgraded';
        v_title := 'Subscription ' || NEW.status;
      ELSE
        v_action := 'updated';
        v_title := 'Subscription updated';
      END IF;
    ELSE
      v_action := 'updated';
      v_title := 'Subscription updated';
    END IF;
    v_description := 'Status: ' || NEW.status;
  END IF;

  PERFORM log_user_activity(
    NEW.user_id,
    'subscription',
    v_action,
    NEW.id,
    v_title,
    v_description,
    jsonb_build_object(
      'status', NEW.status,
      'price_id', NEW.price_id,
      'stripe_customer_id', NEW.stripe_customer_id
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for subscriptions
CREATE TRIGGER subscription_activity_trigger
AFTER INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION track_subscription_activity();

-- Function to get user activity feed
CREATE OR REPLACE FUNCTION get_user_activity_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  action TEXT,
  reference_id UUID,
  title TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.type,
    ua.action,
    ua.reference_id,
    ua.title,
    ua.description,
    ua.metadata,
    ua.created_at
  FROM user_activity ua
  WHERE ua.user_id = p_user_id
  ORDER BY ua.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add text search columns to journal_entries for related entries
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', COALESCE(content, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(ai_summary, '')), 'B')
) STORED;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_journal_entries_search ON journal_entries USING GIN(search_vector);

-- Create index on tags for faster tag-based searches
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING GIN(tags);

-- Function to find related journal entries
CREATE OR REPLACE FUNCTION find_related_journal_entries(
  p_entry_id UUID,
  p_user_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  entry_date DATE,
  content TEXT,
  ai_summary TEXT,
  mood TEXT,
  category TEXT,
  tags TEXT[],
  similarity_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_content TEXT;
  v_tags TEXT[];
  v_category TEXT;
  v_mood TEXT;
BEGIN
  -- Get the current entry's details
  SELECT 
    je.content,
    je.tags,
    je.category,
    je.mood
  INTO 
    v_content,
    v_tags,
    v_category,
    v_mood
  FROM journal_entries je
  WHERE je.id = p_entry_id AND je.user_id = p_user_id;

  -- If entry not found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH related_entries AS (
    SELECT 
      je.id,
      je.entry_date,
      je.content,
      je.ai_summary,
      je.mood,
      je.category,
      je.tags,
      je.created_at,
      -- Calculate similarity score based on multiple factors
      (
        -- Text similarity using full-text search
        CASE 
          WHEN v_content IS NOT NULL AND LENGTH(v_content) > 10 THEN
            ts_rank(je.search_vector, plainto_tsquery('english', v_content)) * 0.4
          ELSE 0
        END +
        -- Tag similarity
        CASE 
          WHEN v_tags IS NOT NULL AND je.tags IS NOT NULL THEN
            (ARRAY_LENGTH(je.tags & v_tags, 1)::FLOAT / GREATEST(ARRAY_LENGTH(je.tags, 1), ARRAY_LENGTH(v_tags, 1))::FLOAT) * 0.3
          ELSE 0
        END +
        -- Category match
        CASE 
          WHEN v_category IS NOT NULL AND je.category = v_category THEN 0.2
          ELSE 0
        END +
        -- Mood match
        CASE 
          WHEN v_mood IS NOT NULL AND je.mood = v_mood THEN 0.1
          ELSE 0
        END
      ) AS similarity_score
    FROM journal_entries je
    WHERE 
      je.user_id = p_user_id
      AND je.id != p_entry_id
  )
  SELECT 
    re.id,
    re.entry_date,
    re.content,
    re.ai_summary,
    re.mood,
    re.category,
    re.tags,
    re.similarity_score,
    re.created_at
  FROM related_entries re
  WHERE re.similarity_score > 0
  ORDER BY re.similarity_score DESC, re.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION find_related_journal_entries TO authenticated;