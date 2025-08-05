import React, { lazy, Suspense } from 'react';
import Loader from '../../shared/components/Loader';

const ProgressChart = lazy(() => import('./ProgressChart'));

interface ProgressChartLazyProps {
  data: {
    date: string;
    journalEntries: number;
    moodboardUpdates: number;
    goalProgress: number;
  }[];
}

export default function ProgressChartLazy(props: ProgressChartLazyProps) {
  return (
    <Suspense 
      fallback={
        <div className="card">
          <div className="h-80 flex items-center justify-center">
            <Loader size="medium" />
          </div>
        </div>
      }
    >
      <ProgressChart {...props} />
    </Suspense>
  );
}