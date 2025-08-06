import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { supabase } from '../core/api/supabase';
import { type PublicSnapshot } from '../core/types';
import MoodboardCanvas from '../features/moodboard/MoodboardCanvas';
import { Eye, Calendar, Home } from 'lucide-react';

export default function ShareSnapshot() {
  const { id } = useParams();
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSnapshot(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadSnapshot = async (snapshotId: string) => {
    try {
      // First increment the view count
      await supabase.rpc('increment_snapshot_views', { snapshot_id: snapshotId });

      // Then fetch the snapshot
      const { data, error } = await supabase
        .from('public_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .eq('is_active', true)
        .single();

      if (error) {throw error;}

      if (!data) {
        setError('This vision board snapshot does not exist or has been removed.');
        return;
      }

      // Check if snapshot has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This vision board snapshot has expired.');
        return;
      }

      setSnapshot(data);
    } catch (error) {
      console.error('Error loading snapshot:', error);
      setError('Failed to load vision board. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading vision board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Oops!</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const { elements = [], title = 'Vision Board', description = '' } = snapshot?.snapshot_data || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🎯</span>
              <span className="font-semibold text-text-primary">MyFutureSelf</span>
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
            >
              Create Your Own
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Title and Meta */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
          {description && (
            <p className="text-text-secondary text-lg mb-4">{description}</p>
          )}
          
          <div className="flex items-center justify-center space-x-6 text-sm text-text-secondary">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Created {snapshot ? new Date(snapshot.created_at).toLocaleDateString() : ''}
            </div>
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {snapshot?.views || 0} views
            </div>
          </div>
        </div>

        {/* Vision Board Canvas */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <MoodboardCanvas
            elements={elements}
            onElementsChange={() => {}}
            onSave={() => {}}
            isEditable={false}
          />
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="card max-w-md mx-auto bg-gradient-to-br from-primary/10 to-accent/10">
            <h3 className="text-xl font-semibold text-text-primary mb-3">
              Create Your Own Vision Board
            </h3>
            <p className="text-text-secondary mb-6">
              Start visualizing your dreams and goals today. Join thousands creating their future.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}