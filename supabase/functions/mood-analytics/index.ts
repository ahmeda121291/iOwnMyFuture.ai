import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Mood keywords for detection
const moodKeywords = {
  happy: ['happy', 'joy', 'excited', 'grateful', 'blessed', 'wonderful', 'amazing', 'great', 'fantastic', 'love', 'cheerful', 'delighted', 'pleased', 'content', 'satisfied'],
  sad: ['sad', 'down', 'depressed', 'unhappy', 'miserable', 'upset', 'disappointed', 'lonely', 'heartbroken', 'grieving', 'melancholy', 'blue', 'despair'],
  anxious: ['anxious', 'worried', 'stressed', 'nervous', 'tense', 'panic', 'fear', 'overwhelmed', 'restless', 'uneasy', 'concerned', 'apprehensive'],
  calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'composed', 'centered', 'balanced', 'mindful', 'zen', 'soothing', 'quiet'],
  energetic: ['energetic', 'motivated', 'productive', 'active', 'dynamic', 'driven', 'ambitious', 'enthusiastic', 'pumped', 'vigorous', 'lively'],
  frustrated: ['frustrated', 'angry', 'annoyed', 'irritated', 'mad', 'furious', 'aggravated', 'exasperated', 'impatient', 'bothered'],
  confident: ['confident', 'strong', 'capable', 'empowered', 'bold', 'assured', 'certain', 'decisive', 'self-assured', 'powerful'],
  grateful: ['grateful', 'thankful', 'appreciative', 'blessed', 'fortunate', 'lucky', 'content', 'fulfilled'],
  hopeful: ['hopeful', 'optimistic', 'positive', 'encouraged', 'inspired', 'uplifted', 'promising', 'bright'],
  tired: ['tired', 'exhausted', 'fatigued', 'drained', 'weary', 'sleepy', 'worn out', 'depleted', 'sluggish']
};

// Habit suggestions based on mood patterns
const habitSuggestions = {
  happy: [
    'Continue your gratitude journaling practice',
    'Share your positive energy with others',
    'Document what brings you joy for future reference'
  ],
  sad: [
    'Try a 10-minute daily walk in nature',
    'Connect with a friend or loved one regularly',
    'Practice self-compassion meditation'
  ],
  anxious: [
    'Implement a morning breathing exercise routine',
    'Limit caffeine intake and try herbal teas',
    'Create a bedtime wind-down ritual'
  ],
  calm: [
    'Maintain your current mindfulness practices',
    'Share your calming techniques with others',
    'Create a peaceful environment in your workspace'
  ],
  energetic: [
    'Channel energy into a new project or goal',
    'Schedule regular physical activity',
    'Balance high energy with rest periods'
  ],
  frustrated: [
    'Practice progressive muscle relaxation',
    'Keep a problem-solving journal',
    'Take regular breaks during challenging tasks'
  ],
  confident: [
    'Set ambitious but achievable goals',
    'Mentor or help others in your area of strength',
    'Document your achievements and progress'
  ],
  grateful: [
    'Expand your gratitude practice to include others',
    'Write thank-you notes to people who matter',
    'Create a gratitude jar or visual reminder'
  ],
  hopeful: [
    'Create a vision board for your goals',
    'Set concrete action steps for your dreams',
    'Share your hopes with supportive people'
  ],
  tired: [
    'Prioritize sleep hygiene and regular bedtime',
    'Practice saying no to prevent overcommitment',
    'Schedule regular rest and recovery time'
  ]
};

interface MoodScore {
  mood: string;
  score: number;
  percentage: number;
}

interface TrendData {
  date: string;
  positivity: number;
  moods: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch last 30 journal entries
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('id, content, ai_summary, entry_date, created_at')
      .eq('user_id', user.id)
      .gte('entry_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('entry_date', { ascending: true })
      .limit(30);

    if (entriesError) {
      throw new Error('Failed to fetch journal entries');
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({
          topMoods: [],
          trendLine: 'neutral',
          trendData: [],
          suggestedHabits: ['Start journaling regularly to track your mood patterns'],
          summary: 'No journal entries found in the past 30 days. Start journaling to see your mood analytics!'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Analyze moods from entries
    const moodCounts: Record<string, number> = {};
    const trendData: TrendData[] = [];
    let totalPositivity = 0;

    for (const entry of entries) {
      const text = (entry.content + ' ' + (entry.ai_summary || '')).toLowerCase();
      const detectedMoods: string[] = [];
      let entryPositivity = 0;
      let moodScores: Record<string, number> = {};

      // Calculate mood scores for this entry
      for (const [mood, keywords] of Object.entries(moodKeywords)) {
        const score = keywords.reduce((acc, keyword) => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = text.match(regex);
          return acc + (matches ? matches.length : 0);
        }, 0);

        if (score > 0) {
          moodScores[mood] = score;
          moodCounts[mood] = (moodCounts[mood] || 0) + score;
        }
      }

      // Get top moods for this entry
      const sortedMoods = Object.entries(moodScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([mood]) => mood);

      detectedMoods.push(...sortedMoods);

      // Calculate positivity score (-1 to 1)
      const positiveMoods = ['happy', 'calm', 'energetic', 'confident', 'grateful', 'hopeful'];
      const negativeMoods = ['sad', 'anxious', 'frustrated', 'tired'];

      const positiveScore = sortedMoods.filter(m => positiveMoods.includes(m)).length;
      const negativeScore = sortedMoods.filter(m => negativeMoods.includes(m)).length;
      
      if (positiveScore + negativeScore > 0) {
        entryPositivity = (positiveScore - negativeScore) / (positiveScore + negativeScore);
      }

      totalPositivity += entryPositivity;

      trendData.push({
        date: entry.entry_date,
        positivity: entryPositivity,
        moods: detectedMoods
      });
    }

    // Calculate top 3 moods
    const totalMoodCounts = Object.values(moodCounts).reduce((a, b) => a + b, 0);
    const topMoods: MoodScore[] = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([mood, count]) => ({
        mood,
        score: count,
        percentage: Math.round((count / totalMoodCounts) * 100)
      }));

    // Determine trend line
    const averagePositivity = totalPositivity / entries.length;
    const recentPositivity = trendData.slice(-7).reduce((acc, d) => acc + d.positivity, 0) / Math.min(7, trendData.length);
    
    let trendLine: 'positive' | 'negative' | 'neutral';
    if (recentPositivity > averagePositivity + 0.1) {
      trendLine = 'positive';
    } else if (recentPositivity < averagePositivity - 0.1) {
      trendLine = 'negative';
    } else {
      trendLine = 'neutral';
    }

    // Generate habit suggestions based on top moods
    const suggestedHabits: string[] = [];
    const seenSuggestions = new Set<string>();

    for (const { mood } of topMoods) {
      const suggestions = habitSuggestions[mood as keyof typeof habitSuggestions] || [];
      for (const suggestion of suggestions) {
        if (!seenSuggestions.has(suggestion) && suggestedHabits.length < 5) {
          suggestedHabits.push(suggestion);
          seenSuggestions.add(suggestion);
        }
      }
    }

    // Generate summary
    const moodDescriptions = topMoods.map(m => `${m.mood} (${m.percentage}%)`).join(', ');
    const trendDescription = trendLine === 'positive' 
      ? 'Your mood has been trending upward recently! Keep up the great work.'
      : trendLine === 'negative'
      ? 'Your mood has been trending downward. Consider trying some of the suggested habits.'
      : 'Your mood has been relatively stable.';

    const summary = `Over the past 30 days, your dominant moods have been ${moodDescriptions}. ${trendDescription}`;

    return new Response(
      JSON.stringify({
        topMoods,
        trendLine,
        trendData,
        suggestedHabits,
        summary,
        totalEntries: entries.length,
        averagePositivity: Math.round(averagePositivity * 100) / 100
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in mood-analytics function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze mood trends' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});