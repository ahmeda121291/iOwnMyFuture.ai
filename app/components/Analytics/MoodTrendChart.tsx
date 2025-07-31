import React from 'react';
import { Smile, Meh, Frown, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface MoodData {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

interface MoodTrendChartProps {
  data: MoodData[];
  chartType?: 'area' | 'bar';
}

export default function MoodTrendChart({ data, chartType = 'area' }: MoodTrendChartProps) {
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'positive':
        return <Smile className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <Frown className="w-4 h-4 text-red-500" />;
      default:
        return <Meh className="w-4 h-4 text-yellow-500" />;
    }
  };

  // Calculate average mood and trend
  const totalMoods = data.reduce((sum, entry) => 
    sum + entry.positive + entry.neutral + entry.negative, 0
  );
  
  const positivePercentage = data.reduce((sum, entry) => sum + entry.positive, 0) / totalMoods * 100;
  const neutralPercentage = data.reduce((sum, entry) => sum + entry.neutral, 0) / totalMoods * 100;
  const negativePercentage = data.reduce((sum, entry) => sum + entry.negative, 0) / totalMoods * 100;

  const trendDirection = positivePercentage > 50 ? 'improving' : 
                        negativePercentage > 50 ? 'declining' : 'stable';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + p.value, 0);
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-text-primary mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm capitalize">{entry.dataKey}</span>
              </div>
              <span className="text-sm font-medium ml-4">
                {entry.value} ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChartComponent = chartType === 'area' ? AreaChart : BarChart;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Mood Trends</h3>
          <p className="text-sm text-text-secondary">Emotional patterns over time</p>
        </div>
        <div className="flex items-center text-sm text-text-secondary">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span className={`capitalize ${
            trendDirection === 'improving' ? 'text-green-600' : 
            trendDirection === 'declining' ? 'text-red-600' : 
            'text-text-secondary'
          }`}>
            {trendDirection}
          </span>
        </div>
      </div>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
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
            
            {chartType === 'area' ? (
              <>
                <Area
                  type="monotone"
                  dataKey="positive"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="neutral"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="negative"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                />
              </>
            ) : (
              <>
                <Bar dataKey="positive" stackId="a" fill="#10b981" />
                <Bar dataKey="neutral" stackId="a" fill="#f59e0b" />
                <Bar dataKey="negative" stackId="a" fill="#ef4444" />
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Mood Legend and Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            {getMoodIcon('positive')}
            <span className="ml-2 text-text-secondary">Positive</span>
            <span className="ml-2 font-medium text-green-600">
              {isNaN(positivePercentage) ? '0' : positivePercentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center">
            {getMoodIcon('neutral')}
            <span className="ml-2 text-text-secondary">Neutral</span>
            <span className="ml-2 font-medium text-yellow-600">
              {isNaN(neutralPercentage) ? '0' : neutralPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center">
            {getMoodIcon('negative')}
            <span className="ml-2 text-text-secondary">Negative</span>
            <span className="ml-2 font-medium text-red-600">
              {isNaN(negativePercentage) ? '0' : negativePercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Insight */}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-4 text-center">
          <p className="text-sm text-text-secondary">
            {trendDirection === 'improving' && 
              "Great job! Your mood has been predominantly positive. Keep up the good work!"
            }
            {trendDirection === 'declining' && 
              "Consider focusing on self-care and positive activities to improve your mood."
            }
            {trendDirection === 'stable' && 
              "Your mood has been balanced. Continue journaling to track patterns."
            }
          </p>
        </div>
      </div>
    </div>
  );
}