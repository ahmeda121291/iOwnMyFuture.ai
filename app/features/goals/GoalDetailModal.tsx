import React, { useState } from 'react';
import { X, Edit2, Trash2, Plus, CheckCircle, Circle } from 'lucide-react';
import { type Goal, type UpdateGoalInput } from '../../services/goals.service';
import { useGoalMilestones } from '../../hooks/useGoals';
import Button from '../../shared/components/Button';

interface GoalDetailModalProps {
  goal: Goal;
  onClose: () => void;
  onUpdate: (goalId: string, input: UpdateGoalInput) => Promise<Goal | null>;
  onDelete: (goalId: string) => Promise<void>;
}

export default function GoalDetailModal({ goal, onClose, onUpdate, onDelete }: GoalDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateGoalInput>({
    title: goal.title,
    description: goal.description,
    target_date: goal.target_date,
    priority: goal.priority,
    progress: goal.progress,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  const { 
    milestones, 
    loading: milestonesLoading,
    createMilestone,
    toggleMilestone,
    deleteMilestone
  } = useGoalMilestones(goal.id);

  const handleSave = async () => {
    await onUpdate(goal.id, editData);
    setIsEditing(false);
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) {
      return;
    }
    
    await createMilestone({
      title: newMilestoneTitle,
      order_index: milestones.length,
    });
    
    setNewMilestoneTitle('');
    setAddingMilestone(false);
  };

  const handleProgressChange = (newProgress: number) => {
    setEditData({ ...editData, progress: newProgress });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Goal' : 'Goal Details'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              {/* Edit Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress: {editData.progress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editData.progress}
                  onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${editData.progress}%` }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={editData.target_date}
                  onChange={(e) => setEditData({ ...editData, target_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Goal Details View */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{goal.title}</h3>
                {goal.description && (
                  <p className="text-gray-600">{goal.description}</p>
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-bold text-gray-900">{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      goal.status === 'completed' ? 'bg-green-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 font-medium capitalize">{goal.status}</span>
                </div>
                <div>
                  <span className="text-gray-500">Priority:</span>
                  <span className="ml-2 font-medium">
                    {goal.priority === 1 ? '🟢 Low' :
                     goal.priority === 2 ? '🔵 Medium-Low' :
                     goal.priority === 3 ? '🟡 Medium' :
                     goal.priority === 4 ? '🟠 Medium-High' :
                     '🔴 High'}
                  </span>
                </div>
                {goal.target_date && (
                  <div>
                    <span className="text-gray-500">Target Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(goal.target_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {goal.category && (
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <span className="ml-2 font-medium capitalize">{goal.category}</span>
                  </div>
                )}
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">Milestones</h4>
                  <button
                    onClick={() => setAddingMilestone(true)}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Milestone
                  </button>
                </div>

                {milestonesLoading ? (
                  <p className="text-gray-500 text-sm">Loading milestones...</p>
                ) : milestones.length === 0 && !addingMilestone ? (
                  <p className="text-gray-500 text-sm">No milestones yet. Add milestones to track your progress!</p>
                ) : (
                  <div className="space-y-2">
                    {milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                      >
                        <button
                          onClick={() => toggleMilestone(milestone.id)}
                          className="flex-shrink-0"
                        >
                          {milestone.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <span className={`flex-1 ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                          {milestone.title}
                        </span>
                        <button
                          onClick={() => deleteMilestone(milestone.id)}
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {addingMilestone && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <input
                          type="text"
                          value={newMilestoneTitle}
                          onChange={(e) => setNewMilestoneTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddMilestone()}
                          placeholder="Enter milestone title..."
                          className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        />
                        <button
                          onClick={handleAddMilestone}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setAddingMilestone(false);
                            setNewMilestoneTitle('');
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {goal.status === 'active' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => onUpdate(goal.id, { status: 'completed', progress: 100 })}
                    className="flex-1"
                  >
                    Mark as Complete
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white rounded-lg flex items-center justify-center">
            <div className="text-center p-6">
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Goal?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{goal.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => onDelete(goal.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Delete Goal
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}