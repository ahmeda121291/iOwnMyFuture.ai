-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('personal', 'career', 'health', 'financial', 'relationships', 'education', 'other')),
  target_date DATE,
  priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3, -- 1=lowest, 5=highest
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  progress INTEGER CHECK (progress BETWEEN 0 AND 100) DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal milestones table for tracking sub-goals
CREATE TABLE public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal updates table for tracking progress updates
CREATE TABLE public.goal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.goal_milestones(id) ON DELETE SET NULL,
  update_text TEXT NOT NULL,
  progress_change INTEGER DEFAULT 0, -- Can be positive or negative
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goal_journal_entries junction table to link goals with journal entries
CREATE TABLE public.goal_journal_entries (
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (goal_id, journal_entry_id)
);

-- Create goal_moodboards junction table to link goals with moodboards
CREATE TABLE public.goal_moodboards (
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  moodboard_id UUID NOT NULL REFERENCES public.moodboards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (goal_id, moodboard_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goals_category ON public.goals(category);
CREATE INDEX idx_goals_target_date ON public.goals(target_date);
CREATE INDEX idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);
CREATE INDEX idx_goal_milestones_completed ON public.goal_milestones(completed);
CREATE INDEX idx_goal_updates_goal_id ON public.goal_updates(goal_id);
CREATE INDEX idx_goal_journal_entries_goal_id ON public.goal_journal_entries(goal_id);
CREATE INDEX idx_goal_journal_entries_journal_entry_id ON public.goal_journal_entries(journal_entry_id);
CREATE INDEX idx_goal_moodboards_goal_id ON public.goal_moodboards(goal_id);
CREATE INDEX idx_goal_moodboards_moodboard_id ON public.goal_moodboards(moodboard_id);

-- Create RLS policies for goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON public.goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" ON public.goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for goal_milestones
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones of their goals" ON public.goal_milestones
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_milestones.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can create milestones for their goals" ON public.goal_milestones
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_milestones.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can update milestones of their goals" ON public.goal_milestones
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_milestones.goal_id
    AND goals.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_milestones.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete milestones of their goals" ON public.goal_milestones
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_milestones.goal_id
    AND goals.user_id = auth.uid()
  ));

-- Create RLS policies for goal_updates
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view updates of their goals" ON public.goal_updates
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_updates.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can create updates for their goals" ON public.goal_updates
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_updates.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete updates of their goals" ON public.goal_updates
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_updates.goal_id
    AND goals.user_id = auth.uid()
  ));

-- Create RLS policies for goal_journal_entries
ALTER TABLE public.goal_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their goal-journal links" ON public.goal_journal_entries
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_journal_entries.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can create goal-journal links" ON public.goal_journal_entries
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_journal_entries.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their goal-journal links" ON public.goal_journal_entries
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_journal_entries.goal_id
    AND goals.user_id = auth.uid()
  ));

-- Create RLS policies for goal_moodboards
ALTER TABLE public.goal_moodboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their goal-moodboard links" ON public.goal_moodboards
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_moodboards.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can create goal-moodboard links" ON public.goal_moodboards
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_moodboards.goal_id
    AND goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their goal-moodboard links" ON public.goal_moodboards
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.id = goal_moodboards.goal_id
    AND goals.user_id = auth.uid()
  ));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_milestones_updated_at BEFORE UPDATE ON public.goal_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-update goal progress based on milestones
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_milestones INTEGER;
  completed_milestones INTEGER;
  new_progress INTEGER;
BEGIN
  -- Count total and completed milestones for the goal
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = TRUE)
  INTO total_milestones, completed_milestones
  FROM public.goal_milestones
  WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id);

  -- Calculate progress percentage
  IF total_milestones > 0 THEN
    new_progress := ROUND((completed_milestones::NUMERIC / total_milestones) * 100);
    
    -- Update the goal's progress
    UPDATE public.goals
    SET progress = new_progress,
        status = CASE 
          WHEN new_progress = 100 AND status = 'active' THEN 'completed'
          WHEN new_progress < 100 AND status = 'completed' THEN 'active'
          ELSE status
        END,
        completed_at = CASE
          WHEN new_progress = 100 AND status = 'active' THEN NOW()
          WHEN new_progress < 100 THEN NULL
          ELSE completed_at
        END
    WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update goal progress when milestones change
CREATE TRIGGER update_goal_progress_on_milestone_change
AFTER INSERT OR UPDATE OR DELETE ON public.goal_milestones
FOR EACH ROW EXECUTE FUNCTION update_goal_progress();