import { supabase } from './supabase';

interface GenerateSummaryData {
  entryContent?: string;
  userGoals?: string;
  preferences?: string;
  existingElements?: unknown[];
  journalSummaries?: string[];
  moodboardData?: unknown;
}

const callGenerateSummaryFunction = async (type: string, data: GenerateSummaryData) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const { data: result, error } = await supabase.functions.invoke('generate-summary', {
    body: { type, data },
  });

  if (error) {
    console.error('Edge Function Error:', error);
    throw error;
  }

  return result;
};

export const generateMoodboard = async (userGoals: string, preferences: string) => {
  try {
    const result = await callGenerateSummaryFunction('generate_moodboard', {
      userGoals,
      preferences
    });
    return result;
  } catch (error) {
    console.error('Error generating moodboard:', error);
    throw error;
  }
};

export const summarizeJournalEntry = async (entryContent: string): Promise<string> => {
  try {
    const result = await callGenerateSummaryFunction('summarize', {
      entryContent
    });
    return result.summary;
  } catch (error) {
    console.error('Error summarizing journal entry:', error);
    throw error;
  }
};

export const generateInsightReport = async (journalSummaries: string[]): Promise<string> => {
  try {
    const result = await callGenerateSummaryFunction('generate_insights', {
      journalSummaries
    });
    return result.report;
  } catch (error) {
    console.error('Error generating insight report:', error);
    throw error;
  }
};

export const generateAdvancedMoodboard = async (userGoals: string, preferences: string, existingElements: unknown[] = []) => {
  try {
    const result = await callGenerateSummaryFunction('generate_advanced_moodboard', {
      userGoals,
      preferences,
      existingElements
    });
    return result;
  } catch (error) {
    console.error('Error generating advanced moodboard:', error);
    throw error;
  }
};

export const analyzeMoodboardProgress = async (moodboardData: unknown, journalSummaries: string[]) => {
  try {
    const result = await callGenerateSummaryFunction('analyze_progress', {
      moodboardData,
      journalSummaries
    });
    return result.analysis;
  } catch (error) {
    console.error('Error analyzing moodboard progress:', error);
    throw error;
  }
};