import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { 
  Palette, 
  Save, 
  Edit, 
  Plus, 
  Sparkles, 
  Grid, 
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { useRequireProPlan } from '../shared/hooks/useRequireProPlan';
import { generateMoodboard, generateAdvancedMoodboard } from '../core/api/openai';
import { updateOnboardingProgress } from '../core/api/onboarding';
import toast from 'react-hot-toast';
import { errorTracker } from '../shared/utils/errorTracking';
import { type Moodboard, type MoodboardElement } from '../core/types';
import { 
  useMoodboards, 
  useMoodboard, 
  useCreateMoodboard, 
  useUpdateMoodboardElements, 
  useDeleteMoodboard,
  useShareMoodboard 
} from '../shared/hooks/queries/useMoodboardQueries';
import VisionSnap from '../features/moodboard/VisionSnap';
import VisionScore from '../features/moodboard/VisionScore';
import Button from '../shared/components/Button';
import Modal from '../shared/components/Modal';
import Loader from '../shared/components/Loader';

// Lazy load the heavy MoodboardCanvas component
const MoodboardCanvas = lazy(() => import('../features/moodboard/MoodboardCanvas'));

// Constants
const PAGE_SIZE = 9; // 3x3 grid

export default function MoodboardPage() {
  // Use Pro plan check hook
  const { isLoading: proLoading, user } = useRequireProPlan();
  
  // State
  const [currentMoodboardId, setCurrentMoodboardId] = useState<string | null>(null);
  const [elements, setElements] = useState<MoodboardElement[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showMoodboardList, setShowMoodboardList] = useState(false);
  const [showAISetup, setShowAISetup] = useState(false);
  const [aiMode, setAiMode] = useState<'basic' | 'advanced'>('basic');
  const [goals, setGoals] = useState('');
  const [preferences, setPreferences] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // React Query hooks - only query when user is available
  const { 
    data: moodboardsData, 
    isLoading: moodboardsLoading,
    error: moodboardsError,
    refetch: refetchMoodboards
  } = useMoodboards({
    userId: user?.id || '',
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchQuery,
  }, {
    enabled: !!user?.id // Only run query when we have a user ID
  });

  const { 
    data: currentMoodboard,
    isLoading: currentMoodboardLoading
  } = useMoodboard(currentMoodboardId || '', {
    enabled: !!currentMoodboardId // Only query when we have a moodboard ID
  });

  const createMutation = useCreateMoodboard();
  const updateElementsMutation = useUpdateMoodboardElements();
  const deleteMutation = useDeleteMoodboard();
  const shareMutation = useShareMoodboard();


  // Load current moodboard when moodboards data changes
  useEffect(() => {
    if (moodboardsData?.data && moodboardsData.data.length > 0 && !currentMoodboardId) {
      const mostRecent = moodboardsData.data[0];
      setCurrentMoodboardId(mostRecent.id);
      setElements(mostRecent.elements || []);
    } else if (moodboardsData?.data && moodboardsData.data.length === 0) {
      setShowAISetup(true);
      setIsEditing(true);
    }
  }, [moodboardsData, currentMoodboardId]);

  // Update elements when current moodboard changes
  useEffect(() => {
    if (currentMoodboard) {
      setElements(currentMoodboard.elements || []);
    }
  }, [currentMoodboard]);


  // Handlers
  const handleCreateMoodboard = useCallback(async () => {
    if (!user) {return;}

    try {
      const newMoodboard = await createMutation.mutateAsync({
        userId: user.id,
        data: {
          title: 'My Vision Board',
          description: 'A collection of my dreams and aspirations',
          elements: [],
        }
      });

      setCurrentMoodboardId(newMoodboard.id);
      setElements([]);
      setIsEditing(true);
      setShowMoodboardList(false);
      
      await updateOnboardingProgress('created_first_moodboard', true);
    } catch (error) {
      errorTracker.trackError(error, { component: 'Moodboard', action: 'createMoodboard' });
      toast.error('Failed to create moodboard. Please try again.');
    }
  }, [user, createMutation]);

  const handleSaveMoodboard = useCallback(async () => {
    if (!currentMoodboardId) {return;}

    try {
      await updateElementsMutation.mutateAsync({
        id: currentMoodboardId,
        elements,
      });
      
      setIsEditing(false);
      toast.success('Moodboard saved successfully!');
    } catch (error) {
      errorTracker.trackError(error, { component: 'Moodboard', action: 'saveMoodboard' });
      toast.error('Failed to save moodboard. Please try again.');
    }
  }, [currentMoodboardId, elements, updateElementsMutation]);

  const handleDeleteMoodboard = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this moodboard?')) {return;}

    try {
      await deleteMutation.mutateAsync(id);
      
      if (id === currentMoodboardId) {
        setCurrentMoodboardId(null);
        setElements([]);
      }
      
      setShowMoodboardList(false);
    } catch (error) {
      errorTracker.trackError(error, { component: 'Moodboard', action: 'deleteMoodboard' });
      toast.error('Failed to delete moodboard. Please try again.');
    }
  }, [currentMoodboardId, deleteMutation]);

  const handleSelectMoodboard = useCallback((moodboard: Moodboard) => {
    setCurrentMoodboardId(moodboard.id);
    setElements(moodboard.elements || []);
    setShowMoodboardList(false);
    setIsEditing(false);
  }, []);

  const handleGenerateAIMoodboard = useCallback(async () => {
    if (!user) {return;}

    setGeneratingAI(true);
    try {
      let generatedElements: MoodboardElement[] = [];
      
      if (aiMode === 'basic') {
        generatedElements = await generateMoodboard(goals);
      } else {
        generatedElements = await generateAdvancedMoodboard(goals, preferences);
      }

      if (currentMoodboardId) {
        // Update existing moodboard
        await updateElementsMutation.mutateAsync({
          id: currentMoodboardId,
          elements: generatedElements,
        });
        setElements(generatedElements);
      } else {
        // Create new moodboard with AI elements
        const newMoodboard = await createMutation.mutateAsync({
          userId: user.id,
          data: {
            title: 'AI Vision Board',
            description: `Generated based on: ${goals}`,
            elements: generatedElements,
          }
        });
        
        setCurrentMoodboardId(newMoodboard.id);
        setElements(generatedElements);
        await updateOnboardingProgress('created_first_moodboard', true);
      }

      setShowAISetup(false);
      setIsEditing(true);
    } catch (error) {
      errorTracker.trackError(error, { component: 'Moodboard', action: 'generateAIMoodboard' });
      toast.error('Failed to generate AI moodboard. Please try again.');
    } finally {
      setGeneratingAI(false);
    }
  }, [user, aiMode, goals, preferences, currentMoodboardId, updateElementsMutation, createMutation]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // Loading state
  if (!user || proLoading || moodboardsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <div className="text-center">
          <Loader size="large" />
          <p className="mt-4 text-text-secondary">Loading your vision boards...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (moodboardsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading moodboards</p>
          <Button onClick={() => refetchMoodboards()}>Retry</Button>
        </div>
      </div>
    );
  }

  const moodboards = moodboardsData?.data || [];
  const totalPages = moodboardsData?.totalPages || 1;

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Vision Board</h1>
            <p className="text-text-secondary">
              Visualize your dreams and manifest your future
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowMoodboardList(!showMoodboardList)}
            >
              <Grid className="w-4 h-4 mr-2" />
              My Boards ({moodboardsData?.total || 0})
            </Button>
            <Button
              onClick={handleCreateMoodboard}
              disabled={createMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Board
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {currentMoodboard && !currentMoodboardLoading ? (
          <div className="space-y-6">
            {/* Board Info */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">
                  {currentMoodboard.title}
                </h2>
                <p className="text-text-secondary flex items-center mt-1">
                  <Clock className="w-4 h-4 mr-1" />
                  Last updated {new Date(currentMoodboard.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-3">
                {!isEditing ? (
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveMoodboard}
                      disabled={updateElementsMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
                <VisionSnap 
                  moodboard={currentMoodboard}
                  onShare={async (isPublic) => {
                    const result = await shareMutation.mutateAsync({
                      id: currentMoodboard.id,
                      isPublic
                    });
                    return result.shareUrl;
                  }}
                />
              </div>
            </div>

            {/* Canvas */}
            <Suspense fallback={
              <div className="h-96 glass-lavender rounded-lg flex items-center justify-center">
                <Loader size="large" />
              </div>
            }>
              <MoodboardCanvas
                elements={elements}
                onElementsChange={setElements}
                onSave={handleSaveMoodboard}
                isEditable={isEditing}
              />
            </Suspense>

            {/* Vision Score */}
            <VisionScore elements={elements} />

            {/* AI Generate Button */}
            {isEditing && (
              <div className="text-center">
                <Button
                  variant="secondary"
                  onClick={() => setShowAISetup(true)}
                  disabled={generatingAI}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-text-primary mb-2">
              Create Your First Vision Board
            </h2>
            <p className="text-text-secondary mb-6">
              Start visualizing your dreams and goals
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                onClick={handleCreateMoodboard}
                disabled={createMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Blank Board
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowAISetup(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Moodboard List Modal */}
      <Modal
        isOpen={showMoodboardList}
        onClose={() => setShowMoodboardList(false)}
        title="My Vision Boards"
        size="large"
      >
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Boards Grid */}
          {moodboards.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-secondary">No boards found</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                {moodboards.map((board) => (
                  <div
                    key={board.id}
                    className="card cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSelectMoodboard(board)}
                  >
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg mb-3 relative overflow-hidden">
                      {board.elements && board.elements.length > 0 && (
                        <div className="absolute inset-0 p-2">
                          <div className="grid grid-cols-2 gap-1 h-full">
                            {board.elements.slice(0, 4).map((el, idx) => (
                              <div
                                key={idx}
                                className="bg-white/50 rounded text-xs p-1 flex items-center justify-center text-center"
                              >
                                {el.type === 'image' ? '🖼️' : el.content.substring(0, 20)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-text-primary mb-1">{board.title}</h3>
                    <p className="text-sm text-text-secondary mb-2">
                      {board.elements?.length || 0} elements
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">
                        {new Date(board.updated_at).toLocaleDateString()}
                      </span>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMoodboard(board.id);
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <span className="text-text-secondary px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* AI Setup Modal */}
      <Modal
        isOpen={showAISetup}
        onClose={() => setShowAISetup(false)}
        title="AI Vision Board Generator"
        size="large"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Generation Mode
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setAiMode('basic')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  aiMode === 'basic'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <h4 className="font-semibold mb-1">Basic</h4>
                <p className="text-sm text-text-secondary">
                  Quick generation based on your goals
                </p>
              </button>
              <button
                onClick={() => setAiMode('advanced')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  aiMode === 'advanced'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <h4 className="font-semibold mb-1">Advanced</h4>
                <p className="text-sm text-text-secondary">
                  Detailed generation with style preferences
                </p>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="goals" className="block text-sm font-medium text-text-primary mb-2">
              What are your goals and dreams?
            </label>
            <textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="E.g., Start a successful business, travel the world, achieve financial freedom..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {aiMode === 'advanced' && (
            <div>
              <label htmlFor="preferences" className="block text-sm font-medium text-text-primary mb-2">
                Style preferences (optional)
              </label>
              <textarea
                id="preferences"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="E.g., Minimalist, motivational quotes, nature imagery, modern aesthetic..."
                className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowAISetup(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAIMoodboard}
              disabled={!goals.trim() || generatingAI}
              loading={generatingAI}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Vision Board
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}