import React, { lazy, Suspense } from 'react';
import Loader from '../../shared/components/Loader';

const MoodAnalyticsPanel = lazy(() => import('./MoodAnalyticsPanel'));

export default function MoodAnalyticsPanelLazy() {
  return (
    <Suspense 
      fallback={
        <div className="card">
          <div className="h-64 flex items-center justify-center">
            <Loader size="medium" />
          </div>
        </div>
      }
    >
      <MoodAnalyticsPanel />
    </Suspense>
  );
}