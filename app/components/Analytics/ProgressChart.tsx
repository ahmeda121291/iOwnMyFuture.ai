import React from 'react';
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

export default function ProgressChart({ data }: ProgressChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-text-primary mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
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
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              wrapperStyle={{
                paddingBottom: '20px',
                fontSize: '14px'
              }}
            />
            <Line
              type="monotone"
              dataKey="journalEntries"
              stroke="#8A2BE2"
              strokeWidth={3}
              dot={{ fill: '#8A2BE2', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#8A2BE2', strokeWidth: 2 }}
              name="Journal Entries"
            />
            <Line
              type="monotone"
              dataKey="moodboardUpdates"
              stroke="#C3B1E1"
              strokeWidth={3}
              dot={{ fill: '#C3B1E1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#C3B1E1', strokeWidth: 2 }}
              name="Moodboard Updates"
            />
            <Line
              type="monotone"
              dataKey="goalProgress"
              stroke="#16a34a"
              strokeWidth={3}
              dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#16a34a', strokeWidth: 2 }}
              name="Goals Achieved"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-primary">
            {data.reduce((sum, d) => sum + d.journalEntries, 0)}
          </div>
          <div className="text-sm text-text-secondary">Total Entries</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-accent">
            {data.reduce((sum, d) => sum + d.moodboardUpdates, 0)}
          </div>
          <div className="text-sm text-text-secondary">Moodboard Updates</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {data.reduce((sum, d) => sum + d.goalProgress, 0)}
          </div>
          <div className="text-sm text-text-secondary">Goals Achieved</div>
        </div>
      </div>
    </div>
  );
}