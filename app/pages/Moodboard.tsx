import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Palette, 
  Save, 
  Eye, 
  Edit, 
  Plus, 
  Sparkles, 
  Grid, 
  List,
  Trash2,
  Share,
  Download,
  Clock
} from 'lucide-react';
import { getCurrentUser, supabase } from '../lib/supabase';
import { generateMoodboard, generateAdvancedMoodboard } from '../lib/openai';
import { updateOnboardingProgress } from '../lib/onboarding';
import MoodboardCanvas from '../components/Moodboard/MoodboardCanvas';
import VisionSnap from '../components/Moodboard/VisionSnap';
import VisionScore from '../components/Moodboard/VisionScore';
import Button from '../components/Shared/Button';
import Modal from '../components/Shared/Modal';
import Loader from '../components/Shared/Loader';

export default function MoodboardPage() {
  const [user, setUser] = useState<any>(null);
  const [moodboards, setMoodboards] = useState<any[]>([]);
  const [currentMoodboard, setCurrentMoodboard] = useState<any>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMoodboardList, setShowMoodboardList] = useState(false);
  const [showAISetup, setShowAISetup] = useState(false);
  const [aiMode, setAiMode] = useState<'basic' | 'advanced'>('basic');
  const [goals, setGoals] = useState('');
  const [preferences, setPreferences] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [journalStats, setJournalStats] = useState({
    totalEntries: 0,
    currentStreak: 0,
    thisMonthEntries: 0
  });
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
      await Promise.all([
        loadMoodboards(userData.id),
        loadJournalStats(userData.id)
      ]);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadMoodboards = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('moodboards')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setMoodboards(data || []);
      
      // Load the most recent moodboard if exists
      if (data && data.length > 0) {
        setCurrentMoodboard(data[0]);
        setElements(data[0].board_data?.elements || []);
        setGoals(data[0].board_data?.goals || '');
        setPreferences(data[0].board_data?.preferences || '');
      } else {
        // No moodboards exist, show AI setup
        setShowAISetup(true);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading moodboards:', error);
    }
  };

  const loadJournalStats = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('entry_date, created_at')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      const entries = data || [];
      const now = new Date();
      const thisMonth = entries.filter(entry => {
        const entryDate = new Date(entry.entry_date);
        return entryDate.getMonth() === now.getMonth() && 
               entryDate.getFullYear() === now.getFullYear();
      });

      // Calculate streak
      let streak = 0;
      const sortedEntries = entries.sort((a, b) => 
        new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );
      
      if (sortedEntries.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const mostRecent = new Date(sortedEntries[0].entry_date);
        mostRecent.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) {
          let checkDate = new Date(mostRecent);
          for (const entry of sortedEntries) {
            const entryDate = new Date(entry.entry_date);
            entryDate.setHours(0, 0, 0, 0);
            
            if (entryDate.getTime() === checkDate.getTime()) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
      }

      setJournalStats({
        totalEntries: entries.length,
        currentStreak: streak,
        thisMonthEntries: thisMonth.length
      });
    } catch (error) {
      console.error('Error loading journal stats:', error);
    }
  };

  const saveMoodboard = async (title: string = 'My Vision Board') => {
    if (!user) return;

    setSaving(true);
    try {
      const boardData = {
        elements,
        goals,
        preferences,
        last_updated: new Date().toISOString()
      };

      if (currentMoodboard) {
        // Update existing moodboard
        const { data, error } = await supabase
          .from('moodboards')
          .update({
            title,
            board_data: boardData,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentMoodboard.id)
          .select()
          .single();

        if (error) throw error;
        setCurrentMoodboard(data);
        
        // Update the moodboards list
        setMoodboards(prev => prev.map(m => m.id === data.id ? data : m));
      } else {
        // Create new moodboard
        const { data, error } = await supabase
          .from('moodboards')
          .insert({
            user_id: user.id,
            title,
            board_data: boardData
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentMoodboard(data);
        setMoodboards(prev => [data, ...prev]);
        
        // Update onboarding progress for first moodboard
        await updateOnboardingProgress('created_first_moodboard', true);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving moodboard:', error);
      alert('Failed to save moodboard. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const createNewMoodboard = () => {
    setCurrentMoodboard(null);
    setElements([]);
    setGoals('');
    setPreferences('');
    setShowAISetup(true);
    setIsEditing(true);
  };

  const loadMoodboard = (moodboard: any) => {
    setCurrentMoodboard(moodboard);
    setElements(moodboard.board_data?.elements || []);
    setGoals(moodboard.board_data?.goals || '');
    setPreferences(moodboard.board_data?.preferences || '');
    setShowMoodboardList(false);
  };

  const deleteMoodboard = async (moodboardId: string) => {
    if (!confirm('Are you sure you want to delete this vision board?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('moodboards')
        .delete()
        .eq('id', moodboardId)
        .eq('user_id', user.id);

      if (error) throw error;

      setMoodboards(prev => prev.filter(m => m.id !== moodboardId));
      
      if (currentMoodboard?.id === moodboardId) {
        const remaining = moodboards.filter(m => m.id !== moodboardId);
        if (remaining.length > 0) {
          loadMoodboard(remaining[0]);
        } else {
          createNewMoodboard();
        }
      }
    } catch (error) {
      console.error('Error deleting moodboard:', error);
      alert('Failed to delete moodboard. Please try again.');
    }
  };

  const generateAIMoodboard = async () => {
    if (!goals.trim()) {
      alert('Please enter your goals first');
      return;
    }

    setGeneratingAI(true);
    try {
      let aiResponse;
      
      if (aiMode === 'advanced') {
        aiResponse = await generateAdvancedMoodboard(goals, preferences, elements);
        
        // Convert advanced AI response to canvas elements
        const newElements: any[] = [];
        let index = 0;
        
        // Add affirmations
        if (aiResponse.affirmations) {
          aiResponse.affirmations.forEach((affirmation: string) => {
            newElements.push({
              id: `affirmation-${Date.now()}-${index}`,
              type: 'text',
              content: affirmation,
              position: { 
                x: (index % 4) * 220 + 50, 
                y: Math.floor(index / 4) * 180 + 50 
              },
              size: { width: 200, height: 120 },
              style: {
                backgroundColor: 'rgba(195, 177, 225, 0.15)',
                color: '#8B5CF6',
                fontSize: 14,
                fontWeight: '600',
                borderRadius: 16,
                textAlign: 'center',
                padding: 16
              }
            });
            index++;
          });
        }
        
        // Add goal cards
        if (aiResponse.goal_cards) {
          aiResponse.goal_cards.forEach((goal: any) => {
            newElements.push({
              id: `goal-${Date.now()}-${index}`,
              type: 'goal',
              content: typeof goal === 'string' ? goal : goal.title || goal.description,
              position: { 
                x: (index % 4) * 220 + 50, 
                y: Math.floor(index / 4) * 180 + 50 
              },
              size: { width: 200, height: 140 },
              style: {
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#16A34A',
                fontSize: 15,
                fontWeight: 'bold',
                borderRadius: 16,
                border: '2px solid rgba(34, 197, 94, 0.3)'
              }
            });
            index++;
          });
        }
        
        // Add visual elements
        if (aiResponse.visual_elements) {
          aiResponse.visual_elements.forEach((element: any) => {
            newElements.push({
              id: `visual-${Date.now()}-${index}`,
              type: 'text',
              content: element.title || element.description,
              position: { 
                x: (index % 4) * 220 + 50, 
                y: Math.floor(index / 4) * 180 + 50 
              },
              size: { width: 200, height: 150 },
              style: {
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#2563EB',
                fontSize: 14,
                fontWeight: '500',
                borderRadius: 12
              }
            });
            index++;
          });
        }
        
        // Add inspiration quotes
        if (aiResponse.inspiration_quotes) {
          aiResponse.inspiration_quotes.forEach((quote: string) => {
            newElements.push({
              id: `quote-${Date.now()}-${index}`,
              type: 'text',
              content: `"${quote}"`,
              position: { 
                x: (index % 4) * 220 + 50, 
                y: Math.floor(index / 4) * 180 + 50 
              },
              size: { width: 200, height: 130 },
              style: {
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#D97706',
                fontSize: 13,
                fontWeight: '500',
                borderRadius: 12,
                fontStyle: 'italic'
              }
            });
            index++;
          });
        }
        
        setElements(newElements);
      } else {
        // Basic AI generation
        aiResponse = await generateMoodboard(goals, preferences);
        
        const newElements = aiResponse.vision_elements?.map((element: any, idx: number) => ({
          id: `basic-${Date.now()}-${idx}`,
          type: element.category === 'goal' ? 'goal' : 'text',
          content: element.title,
          position: { 
            x: (idx % 3) * 220 + 50, 
            y: Math.floor(idx / 3) * 180 + 50 
          },
          size: { width: 200, height: 150 },
          style: {
            backgroundColor: `rgba(138, 43, 226, ${0.1 + (idx % 3) * 0.05})`,
            color: '#8A2BE2',
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 12
          }
        })) || [];

        setElements(newElements);
      }
      
      setShowAISetup(false);
    } catch (error) {
      console.error('Error generating AI moodboard:', error);
      alert('Failed to generate AI moodboard. Please try again.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const addElement = (element: any) => {
    setElements(prev => [...prev, element]);
  };

  // Calculate comprehensive vision score
  const calculateVisionScore = () => {
    const elementsScore = Math.min(elements.length * 8, 40); // Up to 40 points for elements (5 elements = 40)
    const goalsScore = goals.trim() ? 25 : 0; // 25 points for having clear goals
    const journalScore = Math.min(journalStats.currentStreak * 3, 20); // Up to 20 points for journal streak
    const consistencyScore = Math.min(journalStats.thisMonthEntries * 1.5, 15); // Up to 15 points for monthly entries
    
    return Math.min(elementsScore + goalsScore + journalScore + consistencyScore, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-text-primary">
                  {currentMoodboard?.title || 'My Vision Board'}
                </h1>
                {moodboards.length > 1 && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setShowMoodboardList(true)}
                  >
                    <Grid className="w-4 h-4 mr-2" />
                    {moodboards.length} boards
                  </Button>
                )}
              </div>
              <p className="text-text-secondary">
                Visualize your dreams and manifest your future
              </p>
              {currentMoodboard && (
                <div className="flex items-center space-x-4 mt-2 text-sm text-text-secondary">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Updated {new Date(currentMoodboard.updated_at).toLocaleDateString()}
                  </div>
                  <div>
                    {elements.length} elements
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            {moodboards.length > 0 && (
              <Button
                variant="secondary"
                onClick={createNewMoodboard}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Board
              </Button>
            )}
            
            {!isEditing ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Board
                </Button>
                <Button onClick={() => setShowAISetup(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Enhance
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset to saved state
                    if (currentMoodboard) {
                      setElements(currentMoodboard.board_data?.elements || []);
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => saveMoodboard()}
                  loading={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Board
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Canvas */}
          <div className="lg:col-span-3">
            <MoodboardCanvas
              elements={elements}
              onElementsChange={setElements}
              onSave={() => saveMoodboard()}
              isEditable={isEditing}
            />

            {/* Board Actions */}
            {!isEditing && currentMoodboard && (
              <div className="mt-6 flex justify-center space-x-4">
                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                >
                  Print Board
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => alert('Share functionality coming soon!')}
                >
                  Share Vision
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vision Score */}
            <VisionScore
              score={calculateVisionScore()}
              numberOfJournalEntries={journalStats.totalEntries}
              numberOfGoals={elements.filter(e => e.type === 'goal').length}
              numberOfCompletedGoals={elements.filter(e => e.type === 'goal' && e.metadata?.completed).length}
              daysActive={journalStats.currentStreak}
            />

            {/* Vision Snap (Add Elements) */}
            {isEditing && (
              <VisionSnap onAddElement={addElement} />
            )}

            {/* Current Goals */}
            {goals && (
              <div className="card">
                <h3 className="text-lg font-semibold text-text-primary mb-3">My Goals</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{goals}</p>
                {preferences && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-text-primary mb-1">Style Preferences:</p>
                    <p className="text-xs text-text-secondary">{preferences}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tips */}
            <div className="card bg-gradient-to-br from-primary/10 to-accent/10">
              <h3 className="text-lg font-semibold text-text-primary mb-3">💡 Vision Tips</h3>
              <ul className="text-sm text-text-secondary space-y-2">
                <li>• Review your board daily for 5 minutes</li>
                <li>• Add specific, measurable goals</li>
                <li>• Include both short-term and long-term visions</li>
                <li>• Update your board as you achieve goals</li>
                <li>• Use positive, present-tense affirmations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* AI Setup Modal */}
        <Modal
          isOpen={showAISetup}
          onClose={() => setShowAISetup(false)}
          title="Create Your Vision Board"
          className="max-w-2xl"
        >
          <div className="space-y-6">
            {/* AI Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Choose Generation Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAiMode('basic')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    aiMode === 'basic'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold text-text-primary mb-1">Basic</div>
                    <div className="text-sm text-text-secondary">
                      Simple vision elements based on your goals
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setAiMode('advanced')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    aiMode === 'advanced'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold text-text-primary mb-1">Advanced</div>
                    <div className="text-sm text-text-secondary">
                      Affirmations, goals, quotes, and action steps
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                What are your main goals and dreams? *
              </label>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g., Start my own business, travel to Japan, learn guitar, get fit and healthy..."
                className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Style preferences (optional)
              </label>
              <input
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g., minimalist, colorful, nature-themed, professional..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAISetup(false);
                  setIsEditing(true);
                }}
                className="flex-1"
              >
                Create Manually
              </Button>
              <Button
                onClick={generateAIMoodboard}
                disabled={!goals.trim() || generatingAI}
                loading={generatingAI}
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          </div>
        </Modal>

        {/* Moodboard List Modal */}
        <Modal
          isOpen={showMoodboardList}
          onClose={() => setShowMoodboardList(false)}
          title="Your Vision Boards"
          className="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-text-secondary">
                {moodboards.length} vision board{moodboards.length !== 1 ? 's' : ''} found
              </p>
              <Button onClick={createNewMoodboard}>
                <Plus className="w-4 h-4 mr-2" />
                New Board
              </Button>
            </div>

            {moodboards.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {moodboards.map((board) => (
                  <div key={board.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-text-primary">
                        {board.title || 'Untitled Board'}
                      </h3>
                      <button
                        onClick={() => deleteMoodboard(board.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-text-secondary mb-3">
                      {board.board_data?.elements?.length || 0} elements
                    </p>
                    
                    <div className="text-xs text-text-secondary mb-4">
                      Updated {new Date(board.updated_at).toLocaleDateString()}
                    </div>
                    
                    <Button
                      variant="secondary"
                      onClick={() => loadMoodboard(board)}
                      className="w-full"
                    >
                      Open Board
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  No vision boards yet
                </h3>
                <p className="text-text-secondary mb-4">
                  Create your first vision board to start manifesting your dreams.
                </p>
                <Button onClick={createNewMoodboard}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Board
                </Button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}