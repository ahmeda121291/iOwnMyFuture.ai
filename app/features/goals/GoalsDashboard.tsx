import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useGoals } from '../../hooks/useGoals';
import { type Goal, type GoalCategory } from '../../services/goals.service';
import Button from '../../shared/components/Button';
import Loader from '../../shared/components/Loader';
import CreateGoalModal from './CreateGoalModal';
import GoalDetailModal from './GoalDetailModal';

const categoryColors: Record<GoalCategory, string> = {
  personal: 'bg-blue-100 text-blue-800',
  career: 'bg-purple-100 text-purple-800',
  health: 'bg-green-100 text-green-800',
  financial: 'bg-yellow-100 text-yellow-800',
  relationships: 'bg-pink-100 text-pink-800',
  education: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
};

const priorityIcons: Record<number, string> = {
  1: '🟢',
  2: '🔵',
  3: '🟡',
  4: '🟠',
  5: '🔴',
};

export default function GoalsDashboard() {
  const { 
    goals, 
    activeGoals, 
    completedGoals, 
    goalStats, 
    loading, 
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    completeGoal,
    refetch
  } = useGoals();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'active' | 'completed'>('active');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Failed to load goals</p>
        <Button onClick={refetch}>Try Again</Button>
      </div>
    );
  }

  const filteredGoals = viewFilter === 'all' ? goals : 
                        viewFilter === 'active' ? activeGoals : 
                        completedGoals;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {goalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold text-gray-900">{goalStats.activeGoals}</p>
              </div>
              <Target className="w-8 h-8 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{goalStats.completedGoals}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{goalStats.completedThisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-accent-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(goalStats.averageProgress)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Header with filters and create button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Goals</h2>
          <p className="text-gray-600">Track and achieve your aspirations</p>
        </div>

        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewFilter('active')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewFilter === 'active' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setViewFilter('completed')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewFilter === 'completed' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewFilter === 'all' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {viewFilter === 'active' ? 'No active goals' : 
             viewFilter === 'completed' ? 'No completed goals' : 
             'No goals yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {viewFilter === 'active' ? 'Create your first goal to get started' : 
             'Switch to a different view to see your goals'}
          </p>
          {viewFilter === 'active' && (
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Goal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredGoals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedGoal(goal)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{priorityIcons[goal.priority]}</span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {goal.title}
                    </h3>
                    {goal.category && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[goal.category]}`}>
                        {goal.category}
                      </span>
                    )}
                  </div>

                  {goal.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    {/* Progress Bar */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Progress</span>
                        <span className="text-xs font-medium text-gray-700">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            goal.status === 'completed' ? 'bg-green-500' : 
                            goal.progress >= 75 ? 'bg-blue-500' :
                            goal.progress >= 50 ? 'bg-yellow-500' :
                            goal.progress >= 25 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Target Date */}
                    {goal.target_date && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(goal.target_date).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    {goal.status === 'completed' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (goal.status === 'active') {
                        completeGoal(goal.id);
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      goal.status === 'completed' 
                        ? 'bg-green-100 text-green-600 cursor-default' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    disabled={goal.status === 'completed'}
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <CreateGoalModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (input) => {
            const newGoal = await createGoal(input);
            if (newGoal) {
              setShowCreateModal(false);
            }
          }}
        />
      )}

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onUpdate={updateGoal}
          onDelete={async (goalId) => {
            const success = await deleteGoal(goalId);
            if (success) {
              setSelectedGoal(null);
            }
          }}
        />
      )}
    </div>
  );
}