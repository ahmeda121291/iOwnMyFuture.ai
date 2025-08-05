import React, { lazy, Suspense } from 'react';
import Loader from '../../shared/components/Loader';

const MoodTrendChart = lazy(() => import('./MoodTrendChart'));

interface MoodData {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

interface MoodTrendChartLazyProps {
  data: MoodData[];
  chartType?: 'area' | 'bar';
}

export default function MoodTrendChartLazy(props: MoodTrendChartLazyProps) {
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
      <MoodTrendChart {...props} />
    </Suspense>
  );
}