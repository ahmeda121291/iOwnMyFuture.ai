const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const makeOpenAIRequest = async (messages: Array<{ role: string; content: string }>, maxTokens: number = 1000): Promise<string> => {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API request failed');
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

export const generateMoodboard = async (userGoals: string, preferences: string) => {
  try {
    const prompt = `Generate a personalized vision board for someone with these goals: ${userGoals}. 
    Preferences: ${preferences}. 
    Return a JSON object with an array of vision elements, each containing: title, description, category, and suggested_image_prompt.
    Focus on empowering, motivating imagery and text that aligns with achieving these specific goals.`;

    const content = await makeOpenAIRequest([
      { role: 'user', content: prompt }
    ], 1000);

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating moodboard:', error);
    throw error;
  }
};

export const summarizeJournalEntry = async (entryContent: string): Promise<string> => {
  try {
    const prompt = `Summarize this journal entry in 2-3 sentences, focusing on key emotions, insights, and progress toward goals: "${entryContent}"`;

    const summary = await makeOpenAIRequest([
      { role: 'user', content: prompt }
    ], 150);

    return summary;
  } catch (error) {
    console.error('Error summarizing journal entry:', error);
    throw error;
  }
};

export const generateInsightReport = async (journalSummaries: string[]): Promise<string> => {
  try {
    const prompt = `Based on these journal entry summaries from the past month: ${journalSummaries.join('. ')}, 
    generate an insightful report about the user's progress, patterns, emotional trends, and recommendations for achieving their goals.
    Make it encouraging and actionable.`;

    const report = await makeOpenAIRequest([
      { role: 'user', content: prompt }
    ], 800);

    return report;
  } catch (error) {
    console.error('Error generating insight report:', error);
    throw error;
  }
};

export const generateAdvancedMoodboard = async (userGoals: string, preferences: string, existingElements: any[] = []) => {
  try {
    const existingContext = existingElements.length > 0 
      ? `Existing elements: ${existingElements.map(el => el.content).join(', ')}. ` 
      : '';
    
    const prompt = `${existingContext}Generate an enhanced, personalized vision board for someone with these goals: ${userGoals}. 
    Preferences: ${preferences}. 
    
    Return a JSON object with:
    1. "affirmations" array - 5 powerful, personalized affirmations
    2. "visual_elements" array - 8 specific visual elements with titles, descriptions, and image prompts
    3. "goal_cards" array - 3 specific, measurable goals with deadlines
    4. "inspiration_quotes" array - 3 motivational quotes relevant to their goals
    5. "action_steps" array - 5 concrete action steps they can take
    
    Make everything highly specific and personalized to their unique goals and situation.`;

    const content = await makeOpenAIRequest([
      { role: 'user', content: prompt }
    ], 1500);

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating advanced moodboard:', error);
    throw error;
  }
};

export const analyzeMoodboardProgress = async (moodboardData: any, journalSummaries: string[]) => {
  try {
    const prompt = `Analyze this user's vision board progress:
    
    Vision Board Elements: ${JSON.stringify(moodboardData)}
    Recent Journal Summaries: ${journalSummaries.join('. ')}
    
    Provide an analysis of:
    1. How well their daily actions align with their vision board goals
    2. Specific recommendations to bridge any gaps
    3. Celebration of progress made
    4. Suggested adjustments to their vision board
    
    Keep it encouraging, specific, and actionable.`;

    const analysis = await makeOpenAIRequest([
      { role: 'user', content: prompt }
    ], 1000);

    return analysis;
  } catch (error) {
    console.error('Error analyzing moodboard progress:', error);
    throw error;
  }
};