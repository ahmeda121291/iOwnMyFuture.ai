import React from 'react';
import { TrendingUp, Calendar, Target, BookOpen } from 'lucide-react';

interface ProgressChartProps {
  data: {
    labels: string[];
    journalEntries: number[];
    moodboardUpdates: number[];
    goalProgress: number[];
  };
}

export default function ProgressChart({ data }: ProgressChartProps) {
  const maxValue = Math.max(
    ...data.journalEntries,
    ...data.moodboardUpdates,
    ...data.goalProgress
  );

  const normalizeValue = (value: number) => (value / maxValue) * 100;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Weekly Progress</h3>
        <TrendingUp className="w-5 h-5 text-accent" />
      </div>

      {/* Chart */}
      <div className="relative h-48 mb-6">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="40"
              y1={160 - (y * 1.2)}
              x2="380"
              y2={160 - (y * 1.2)}
              stroke="#E5E7EB"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}

          {/* Journal Entries Line */}
          <polyline
            points={data.labels.map((_, index) => 
              `${60 + index * 45},${160 - normalizeValue(data.journalEntries[index]) * 1.2}`
            ).join(' ')}
            fill="none"
            stroke="#8A2BE2"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Moodboard Updates Line */}
          <polyline
            points={data.labels.map((_, index) => 
              `${60 + index * 45},${160 - normalizeValue(data.moodboardUpdates[index]) * 1.2}`
            ).join(' ')}
            fill="none"
            stroke="#C3B1E1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Goal Progress Line */}
          <polyline
            points={data.labels.map((_, index) => 
              `${60 + index * 45},${160 - normalizeValue(data.goalProgress[index]) * 1.2}`
            ).join(' ')}
            fill="none"
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {data.labels.map((_, index) => (
            <g key={index}>
              <circle
                cx={60 + index * 45}
                cy={160 - normalizeValue(data.journalEntries[index]) * 1.2}
                r="4"
                fill="#8A2BE2"
              />
              <circle
                cx={60 + index * 45}
                cy={160 - normalizeValue(data.moodboardUpdates[index]) * 1.2}
                r="4"
                fill="#C3B1E1"
              />
              <circle
                cx={60 + index * 45}
                cy={160 - normalizeValue(data.goalProgress[index]) * 1.2}
                r="4"
                fill="#16a34a"
              />
            </g>
          ))}

          {/* X-axis labels */}
          {data.labels.map((label, index) => (
            <text
              key={index}
              x={60 + index * 45}
              y={185}
              textAnchor="middle"
              className="text-xs fill-current text-text-secondary"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-accent rounded-full mr-2"></div>
          <span className="text-text-secondary">Journal Entries</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
          <span className="text-text-secondary">Vision Board Updates</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-text-secondary">Goal Progress</span>
        </div>
      </div>
    </div>
  );
}