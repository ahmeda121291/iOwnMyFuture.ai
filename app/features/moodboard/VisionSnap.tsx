import React, { useState } from 'react';
import { Image, Type, Target, Plus, Sparkles, Share2, Link2 } from 'lucide-react';
import { generateAdvancedMoodboard } from '../../core/api/openai';
import { supabase } from '../../core/api/supabase';
import { type MoodboardElement } from '../../core/types';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';
import { errorTracker } from '../../shared/utils/errorTracking';

interface VisionSnapProps {
  onAddElement: (element: MoodboardElement) => void;
  moodboardId?: string;
  moodboardData?: {
    elements: MoodboardElement[];
    goals?: string;
    preferences?: string;
    title?: string;
  };
}

export default function VisionSnap({ onAddElement, moodboardId, moodboardData }: VisionSnapProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const elementTemplates: Array<{
    type: MoodboardElement['type'];
    icon: React.ReactNode;
    label: string;
    template: Partial<MoodboardElement>;
  }> = [
    {
      type: 'text',
      icon: <Type className="w-5 h-5" />,
      label: 'Affirmation',
      template: {
        content: 'I am capable of achieving anything I set my mind to',
        style: {
          backgroundColor: 'rgba(138, 43, 226, 0.1)',
          color: '#8A2BE2',
          fontSize: 16,
          fontWeight: 'bold',
          borderRadius: 12
        }
      }
    },
    {
      type: 'goal',
      icon: <Target className="w-5 h-5" />,
      label: 'Goal Card',
      template: {
        content: 'My goal for this year...',
        style: {
          borderRadius: 12
        }
      }
    },
    {
      type: 'image',
      icon: <Image className="w-5 h-5" />,
      label: 'Vision Image',
      template: {
        content: 'https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=300',
        style: {
          borderRadius: 8
        }
      }
    }
  ];

  const generateAIElements = async () => {
    if (!aiPrompt.trim()) {return;}
    
    setGenerating(true);
    try {
      // Generate advanced AI elements
      const aiResponse = await generateAdvancedMoodboard(aiPrompt, '', []);
      
      // Convert AI response to canvas elements
      const newElements: Partial<MoodboardElement>[] = [];
      
      // Add affirmations
      if (aiResponse.affirmations) {
        aiResponse.affirmations.forEach((affirmation: string, index: number) => {
          newElements.push({
            type: 'text',
            content: affirmation,
            style: {
              backgroundColor: `rgba(138, 43, 226, ${0.1 + (index % 3) * 0.05})`,
              color: '#8A2BE2',
              fontSize: 16,
              fontWeight: 'bold',
              borderRadius: 12
            }
          });
        });
      }
      
      // Add goal cards
      if (aiResponse.goal_cards) {
        aiResponse.goal_cards.forEach((goal: string | { title?: string; description?: string }) => {
          newElements.push({
            type: 'goal',
            content: typeof goal === 'string' ? goal : goal.title || goal.description,
            style: { borderRadius: 12 }
          });
        });
      }
      
      // Add inspiration quotes
      if (aiResponse.inspiration_quotes) {
        aiResponse.inspiration_quotes.forEach((quote: string) => {
          newElements.push({
            type: 'text',
            content: quote,
            style: {
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              color: '#16a34a',
              fontSize: 14,
              fontWeight: 'normal',
              borderRadius: 12
            }
          });
        });
      }

      // Add elements to canvas
      newElements.forEach((element, index) => {
        setTimeout(() => {
          onAddElement({
            ...element,
            id: (Date.now() + index).toString(),
            content: element.content || '',
            position: { 
              x: 50 + (index % 4) * 150, 
              y: 50 + Math.floor(index / 4) * 120 
            },
            size: { width: 200, height: 150 },
            style: element.style || {}
          } as MoodboardElement);
        }, index * 300);
      });

      setAiPrompt('');
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'VisionSnap', 
        action: 'generateAIElements' 
      });
      toast.error('Failed to generate AI elements. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const addTemplate = (template: Partial<MoodboardElement>, type: MoodboardElement['type']) => {
    const newElement: MoodboardElement = {
      id: Date.now().toString(),
      type,
      content: '',
      position: { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
      size: { width: 200, height: 150 },
      style: {},
      ...template
    };
    
    onAddElement(newElement);
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Add Vision Elements</h3>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'bg-white text-accent shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            AI Generate
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'manual'
                ? 'bg-white text-accent shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Templates
          </button>
        </div>
      </div>

      {activeTab === 'ai' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Describe your vision or goal
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., 'I want to start my own successful business', 'I want to travel the world', 'I want to be healthier and more confident'..."
              className="w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
            />
          </div>
          
          <Button
            onClick={generateAIElements}
            disabled={!aiPrompt.trim() || generating}
            loading={generating}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Vision Elements
          </Button>

          <div className="text-xs text-text-secondary">
            💡 AI will create personalized affirmations, goals, and suggest relevant imagery for your vision board
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {elementTemplates.map((template, index) => (
            <button
              key={index}
              onClick={() => addTemplate(template.template, template.type)}
              className="w-full p-3 border border-gray-200 rounded-lg hover:border-accent/50 hover:bg-accent/5 transition-colors flex items-center"
            >
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mr-3">
                {template.icon}
              </div>
              <div className="text-left">
                <p className="font-medium text-text-primary">{template.label}</p>
                <p className="text-sm text-text-secondary">
                  {template.type === 'text' && 'Add motivational text'}
                  {template.type === 'goal' && 'Create a goal card'}
                  {template.type === 'image' && 'Add inspirational image'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs font-medium text-text-primary mb-2">Quick Add:</p>
        <div className="flex space-x-2">
          <button
            onClick={() => addTemplate({
              content: 'I am unstoppable',
              style: {
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#16a34a',
                fontSize: 16,
                fontWeight: 'bold',
                borderRadius: 12
              }
            }, 'text')}
            className="flex-1 py-2 px-3 bg-green-50 text-green-600 rounded-lg text-xs hover:bg-green-100 transition-colors"
          >
            Affirmation
          </button>
          <button
            onClick={() => addTemplate({
              content: 'Dream big, work hard',
              style: {
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                fontSize: 16,
                fontWeight: 'bold',
                borderRadius: 12
              }
            }, 'text')}
            className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors"
          >
            Motivation
          </button>
        </div>
      </div>

      {/* Share Actions */}
      {moodboardId && moodboardData && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-text-primary mb-3">Share your vision:</p>
          <div className="space-y-2">
            <Button
              onClick={async () => {
                setSharing(true);
                try {
                  // Generate public snapshot
                  const { data: snapshot, error } = await supabase
                    .from('public_snapshots')
                    .insert({
                      moodboard_id: moodboardId,
                      snapshot_data: moodboardData,
                      title: 'My Vision Board',
                      description: 'Creating my future, one vision at a time'
                    })
                    .select()
                    .single();

                  if (error) {throw error;}

                  const publicUrl = `${window.location.origin}/share/${snapshot.id}`;
                  setShareUrl(publicUrl);

                  // Open Twitter share
                  const tweetText = encodeURIComponent('Check out my vision board! Creating my future, one vision at a time 🌟');
                  const tweetUrl = encodeURIComponent(publicUrl);
                  window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`, '_blank');
                } catch (error) {
                  errorTracker.trackError(error, { 
                    component: 'VisionSnap', 
                    action: 'createShareLink' 
                  });
                  toast.error('Failed to create share link. Please try again.');
                } finally {
                  setSharing(false);
                }
              }}
              disabled={sharing}
              loading={sharing}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share to X/Twitter
            </Button>

            <Button
              onClick={async () => {
                if (shareUrl) {
                  // Copy existing URL
                  navigator.clipboard.writeText(shareUrl);
                  toast.success('Share link copied to clipboard!');
                } else {
                  // Generate new snapshot
                  setSharing(true);
                  try {
                    const { data: snapshot, error } = await supabase
                      .from('public_snapshots')
                      .insert({
                        moodboard_id: moodboardId,
                        snapshot_data: moodboardData,
                        title: 'My Vision Board',
                        description: 'Creating my future, one vision at a time'
                      })
                      .select()
                      .single();

                    if (error) {throw error;}

                    const publicUrl = `${window.location.origin}/share/${snapshot.id}`;
                    setShareUrl(publicUrl);
                    
                    navigator.clipboard.writeText(publicUrl);
                    toast.success('Share link copied to clipboard!');
                  } catch (error) {
                    errorTracker.trackError(error, { 
                      component: 'VisionSnap', 
                      action: 'createPublicShareLink' 
                    });
                    toast.error('Failed to create share link. Please try again.');
                  } finally {
                    setSharing(false);
                  }
                }
              }}
              disabled={sharing}
              loading={sharing}
              variant="secondary"
              className="w-full"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Copy Share Link
            </Button>

            {shareUrl && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-text-secondary truncate">{shareUrl}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}