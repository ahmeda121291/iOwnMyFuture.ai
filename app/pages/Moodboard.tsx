import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Save, Eye, Edit, Plus, Sparkles } from 'lucide-react';
import { getCurrentUser, supabase } from '../lib/supabase';
import { generateMoodboard } from '../lib/openai';
import MoodboardCanvas from '../components/Moodboard/MoodboardCanvas';
import VisionSnap from '../components/Moodboard/VisionSnap';
import VisionScore from '../components/Moodboard/VisionScore';
import Button from '../components/Shared/Button';
import Modal from '../components/Shared/Modal';
import Loader from '../components/Shared/Loader';

export default function MoodboardPage() {
  const [user, setUser] = useState<any>(null);
  const [moodboard, setMoodboard] = useState<any>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [goals, setGoals] = useState('');
  const [preferences, setPreferences] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
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
      await loadMoodboard(userData.id);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const loadMoodboard = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('moodboards')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setMoodboard(data);
        setElements(data.board_data?.elements || []);
      } else {
        // No moodboard exists, show goal setup
        setShowGoalSetup(true);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading moodboard:', error);
    }
  };

  const saveMoodboard = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const boardData = {
        elements,
        goals,
        preferences,
        last_updated: new Date().toISOString()
      };

      if (moodboard) {
        // Update existing moodboard
        const { data, error } = await supabase
          .from('moodboards')
          .update({
            board_data: boardData,
            updated_at: new Date().toISOString()
          })
          .eq('id', moodboard.id)
          .select()
          .single();

        if (error) throw error;
        setMoodboard(data);
      } else {
        // Create new moodboard
        const { data, error } = await supabase
          .from('moodboards')
          .insert({
            user_id: user.id,
            board_data: boardData
          })
          .select()
          .single();

        if (error) throw error;
        setMoodboard(data);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving moodboard:', error);
      alert('Failed to save moodboard. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const generateAIMoodboard = async () => {
    if (!goals.trim()) {
      alert('Please enter your goals first');
      return;
    }

    setGeneratingAI(true);
    try {
      const aiElements = await generateMoodboard(goals, preferences);
      
      // Convert AI response to canvas elements
      const newElements = aiElements.vision_elements?.map((element: any, index: number) => ({
        id: Date.now() + index,
        type: element.category === 'goal' ? 'goal' : 'text',
        content: element.title,
        position: { 
          x: (index % 3) * 220 + 50, 
          y: Math.floor(index / 3) * 180 + 50 
        },
        size: { width: 200, height: 150 },
        style: {
          backgroundColor: `rgba(138, 43, 226, ${0.1 + (index % 3) * 0.05})`,
          color: '#8A2BE2',
          fontSize: 16,
          fontWeight: 'bold',
          borderRadius: 12
        }
      })) || [];

      setElements(newElements);
      setShowGoalSetup(false);
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

  // Calculate vision score based on activity
  const calculateVisionScore = () => {
    const baseScore = Math.min(elements.length * 10, 50); // Up to 50 points for elements
    const goalScore = goals.trim() ? 20 : 0; // 20 points for having goals
    const journalScore = 15; // Placeholder - would come from actual journal entries
    const consistencyScore = 15; // Placeholder - based on regular usage
    
    return Math.min(baseScore + goalScore + journalScore + consistencyScore, 100);
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
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">My Vision Board</h1>
            <p className="text-text-secondary">
              Visualize your dreams and manifest your future
            </p>
          </div>
          
          <div className="flex space-x-3">
            {!isEditing ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Board
                </Button>
                <Button onClick={() => setShowGoalSetup(true)}>
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
                    if (moodboard) {
                      setElements(moodboard.board_data?.elements || []);
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveMoodboard}
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
              onSave={saveMoodboard}
              isEditable={isEditing}
            />

            {/* Board Actions */}
            {!isEditing && moodboard && (
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
              metrics={{
                goalsSet: goals.trim() ? 1 : 0,
                journalEntries: 0, // Would come from actual data
                daysActive: 1,
                achievements: elements.filter(e => e.type === 'goal').length
              }}
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

        {/* Goal Setup Modal */}
        <Modal
          isOpen={showGoalSetup}
          onClose={() => setShowGoalSetup(false)}
          title="Set Up Your Vision Board"
          className="max-w-lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                What are your main goals and dreams?
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
                  setShowGoalSetup(false);
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
      </div>
    </div>
  );
}