import React, { useMemo, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ProgressChartProps {
  data: {
    date: string;
    journalEntries: number;
    moodboardUpdates: number;
    goalProgress: number;
  }[];
}

// Memoized Tooltip Component
const CustomTooltip = React.memo(({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-text-primary mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center p-4">
      <p className="text-sm text-text-secondary">No progress data available</p>
    </div>
  );
});

// Memoized Stats Item Component
const StatItem = React.memo(({ 
  value, 
  label, 
  colorClass 
}: { 
  value: number; 
  label: string; 
  colorClass: string;
}) => (
  <div>
    <div className={`text-2xl font-bold ${colorClass}`}>
      {value}
    </div>
    <div className="text-sm text-text-secondary">{label}</div>
  </div>
));

function ProgressChart({ data }: ProgressChartProps) {
  // Memoize summary statistics
  const { totalEntries, totalMoodboardUpdates, totalGoals } = useMemo(() => ({
    totalEntries: data.reduce((sum, d) => sum + d.journalEntries, 0),
    totalMoodboardUpdates: data.reduce((sum, d) => sum + d.moodboardUpdates, 0),
    totalGoals: data.reduce((sum, d) => sum + d.goalProgress, 0)
  }), [data]);

  // Memoize chart configuration
  const chartMargin = useMemo(() => ({
    top: 5,
    right: 30,
    left: 20,
    bottom: 5,
  }), []);

  const legendWrapperStyle = useMemo(() => ({
    paddingBottom: '20px',
    fontSize: '14px'
  }), []);

  // Memoize line configurations
  const lineConfigurations = useMemo(() => [
    {
      dataKey: "journalEntries",
      stroke: "#8A2BE2",
      name: "Journal Entries"
    },
    {
      dataKey: "moodboardUpdates",
      stroke: "#C3B1E1",
      name: "Moodboard Updates"
    },
    {
      dataKey: "goalProgress",
      stroke: "#16a34a",
      name: "Goals Achieved"
    }
  ], []);

  // Memoize render functions
  const renderCustomTooltip = useCallback((props: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => <CustomTooltip {...props} />, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Weekly Progress</h3>
          <p className="text-sm text-text-secondary">Track your journey over time</p>
        </div>
        <TrendingUp className="w-5 h-5 text-accent" />
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={chartMargin}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={renderCustomTooltip} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              wrapperStyle={legendWrapperStyle}
            />
            {lineConfigurations.map((config) => (
              <Line
                key={config.dataKey}
                type="monotone"
                dataKey={config.dataKey}
                stroke={config.stroke}
                strokeWidth={3}
                dot={{ fill: config.stroke, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: config.stroke, strokeWidth: 2 }}
                name={config.name}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
        <StatItem 
          value={totalEntries} 
          label="Total Entries" 
          colorClass="text-primary" 
        />
        <StatItem 
          value={totalMoodboardUpdates} 
          label="Moodboard Updates" 
          colorClass="text-accent" 
        />
        <StatItem 
          value={totalGoals} 
          label="Goals Achieved" 
          colorClass="text-green-600" 
        />
      </div>
    </div>
  );
}

export default React.memo(ProgressChart);