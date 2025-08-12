import React, { useState } from 'react';
import { X } from 'lucide-react';
import { type CreateGoalInput, type GoalCategory, type GoalPriority } from '../../services/goals.service';
import Button from '../../shared/components/Button';

interface CreateGoalModalProps {
  onClose: () => void;
  onCreate: (input: CreateGoalInput) => Promise<void>;
}

const categories: { value: GoalCategory; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'career', label: 'Career' },
  { value: 'health', label: 'Health' },
  { value: 'financial', label: 'Financial' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

const priorities: { value: GoalPriority; label: string; icon: string }[] = [
  { value: 1, label: 'Low', icon: '🟢' },
  { value: 2, label: 'Medium-Low', icon: '🔵' },
  { value: 3, label: 'Medium', icon: '🟡' },
  { value: 4, label: 'Medium-High', icon: '🟠' },
  { value: 5, label: 'High', icon: '🔴' },
];

export default function CreateGoalModal({ onClose, onCreate }: CreateGoalModalProps) {
  const [formData, setFormData] = useState<CreateGoalInput>({
    title: '',
    description: '',
    category: 'personal',
    target_date: '',
    priority: 3,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onCreate(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create New Goal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Goal Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Learn Spanish"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe your goal and why it's important..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as GoalCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {priorities.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: priority.value })}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                    formData.priority === priority.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-lg">{priority.icon}</span>
                  <span className="text-xs block mt-1">{priority.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label htmlFor="target_date" className="block text-sm font-medium text-gray-700 mb-1">
              Target Date
            </label>
            <input
              type="date"
              id="target_date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !formData.title.trim()}
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}