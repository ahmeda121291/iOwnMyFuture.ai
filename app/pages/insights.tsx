import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  BookOpen, 
  Award, 
  Brain, 
  Download,
  RefreshCw 
} from 'lucide-react';
import { getCurrentUser, supabase } from '../lib/supabase';
import { generateInsightReport } from '../lib/openai';
import ProgressChart from '../components/Analytics/ProgressChart';
import InsightCard from '../components/Analytics/InsightCard';
import MoodTrendChart from '../components/Analytics/MoodTrendChart';
import Button from '../components/Shared/Button';
import Loader from '../components/Shared/Loader';

export default function InsightsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [moodboards, setMoodboards] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        navigate('/auth');
        return;
      }
      setUser(userData);
      await loadUserData(userData.id);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      // Load journal entries
      const { data: entries, error: entriesError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .limit(30);

      if (entriesError) throw entriesError;
      setJournalEntries(entries || []);

      // Load moodboards
      const { data: boards, error: boardsError } = await supabase
        .from('moodboards')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (boardsError) throw boardsError;
      setMoodboards(boards || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const generateAIInsightReport = async () => {
    if (journalEntries.length === 0) {
      alert('You need some journal entries first to generate insights!');
      return;
    }

    setGeneratingReport(true);
    try {
      const summaries = journalEntries
        .filter(entry => entry.ai_summary)
        .map(entry => entry.ai_summary)
        .slice(0, 10); // Last 10 entries with summaries

      if (summaries.length === 0) {
        throw new Error('No journal summaries available. Try writing more journal entries first!');
      }

      const report = await generateInsightReport(summaries);
      setAiReport(report);
    } catch (error: any) {
      console.error('Error generating insight report:', error);
      alert(error.message || 'Failed to generate insight report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Generate sample data for charts
  const getProgressData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    return {
      labels: last7Days,
      journalEntries: [0, 1, 0, 2, 1, 1, 0], // Sample data
      moodboardUpdates: [0, 0, 1, 0, 1, 0, 1], // Sample data
      goalProgress: [10, 15, 20, 25, 30, 35, 40] // Sample data
    };
  };

  const getMoodData = () => {
    // Generate sample mood data based on journal entries
    return Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      mood: ['positive', 'neutral', 'positive', 'positive', 'neutral', 'positive', 'positive'][i] as 'positive' | 'neutral' | 'negative',
      intensity: Math.floor(Math.random() * 5) + 1
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader size="large" />
      </div>
    );
  }

  const progressData = getProgressData();
  const moodData = getMoodData();

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Insights & Analytics</h1>
            <p className="text-text-secondary">
              Track your progress and discover patterns in your journey
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => window.print()}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              onClick={generateAIInsightReport}
              loading={generatingReport}
            >
              <Brain className="w-4 h-4 mr-2" />
              Generate AI Insights
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <InsightCard
            title="Total Journal Entries"
            value={journalEntries.length}
            change="+3 this week"
            changeType="positive"
            icon={BookOpen}
            description="Consistency is key to growth"
          />
          <InsightCard
            title="Vision Boards Created"
            value={moodboards.length}
            change="1 active"
            changeType="positive"
            icon={Target}
            description="Visual goals drive success"
          />
          <InsightCard
            title="Days Active"
            value="12"
            change="+2 vs last week"
            changeType="positive"
            icon={Calendar}
            description="Building healthy habits"
          />
          <InsightCard
            title="Goals Achieved"
            value="3"
            change="50% completion rate"
            changeType="positive"
            icon={Award}
            description="Celebrating your wins"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Analytics */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Chart */}
            <ProgressChart data={progressData} />

            {/* AI Insight Report */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">AI-Generated Insights</h3>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={generateAIInsightReport}
                  loading={generatingReport}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>

              {aiReport ? (
                <div className="prose max-w-none">
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                    <div className="flex items-start">
                      <Brain className="w-5 h-5 text-accent mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-accent mb-2">AI Analysis</p>
                        <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">
                          {aiReport}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-text-primary mb-2">
                    Ready for AI Insights?
                  </h4>
                  <p className="text-text-secondary mb-4">
                    Generate a personalized report based on your journal entries and progress patterns.
                  </p>
                  <Button
                    onClick={generateAIInsightReport}
                    loading={generatingReport}
                    disabled={journalEntries.length === 0}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Generate First Report
                  </Button>
                  {journalEntries.length === 0 && (
                    <p className="text-sm text-text-secondary mt-2">
                      Write some journal entries first to enable AI insights
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Recent Activity Timeline */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-6">Recent Activity</h3>
              
              <div className="space-y-4">
                {journalEntries.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} className="flex items-start">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-text-primary">
                          Journal Entry
                        </p>
                        <span className="text-xs text-text-secondary">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {entry.ai_summary || entry.content.substring(0, 100) + '...'}
                      </p>
                    </div>
                  </div>
                ))}
                
                {journalEntries.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-text-secondary">No recent activity to show</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mood Trends */}
            <MoodTrendChart data={moodData} />

            {/* Goals Progress */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Active Goals</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-primary">Health & Fitness</span>
                    <span className="text-sm font-medium text-accent">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-primary">Career Growth</span>
                    <span className="text-sm font-medium text-accent">60%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-primary">Personal Development</span>
                    <span className="text-sm font-medium text-accent">40%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Summary */}
            <div className="card bg-gradient-to-br from-primary/10 to-accent/10">
              <h3 className="text-lg font-semibold text-text-primary mb-3">This Week's Wins</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Maintained daily journaling streak
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Updated vision board with new goals
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Positive mood trend detected
                </li>
              </ul>
            </div>

            {/* Next Steps */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-3">Recommended Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/journal')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-accent/50 hover:bg-accent/5 transition-colors"
                >
                  <p className="text-sm font-medium text-text-primary">Continue Journaling</p>
                  <p className="text-xs text-text-secondary">Write about today's experiences</p>
                </button>
                
                <button
                  onClick={() => navigate('/moodboard')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-accent/50 hover:bg-accent/5 transition-colors"
                >
                  <p className="text-sm font-medium text-text-primary">Update Vision Board</p>
                  <p className="text-xs text-text-secondary">Refine your goals and dreams</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}