import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RefreshCcw, Share2, Info } from 'lucide-react';
import { CalculationResult } from '../types';

interface ResultViewProps {
  result: CalculationResult;
  onReset: () => void;
  age: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const slice = payload[0].payload;
    const sources = slice?.sources;
    return (
      <div className="bg-slate-900 text-white text-sm p-3 rounded-lg shadow-xl border border-slate-700 min-w-[140px]">
        <p className="font-bold mb-1">{payload[0].name}</p>
        <p className="text-blue-300 font-mono mb-2">{payload[0].value.toFixed(2)}%</p>
        {sources && (sources.time != null || sources.bloodline != null || sources.emotion != null) && (
          <div className="border-t border-slate-600 pt-2 mt-2 space-y-1">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">By source</p>
            {sources.time != null && sources.time > 0 && (
              <p className="text-slate-300 text-xs">Time: <span className="font-mono text-blue-300">{sources.time}%</span></p>
            )}
            {sources.bloodline != null && sources.bloodline > 0 && (
              <p className="text-slate-300 text-xs">Bloodline: <span className="font-mono text-pink-300">{sources.bloodline}%</span></p>
            )}
            {sources.emotion != null && sources.emotion > 0 && (
              <p className="text-slate-300 text-xs">Emotion: <span className="font-mono text-amber-300">{sources.emotion}%</span></p>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const ResultView: React.FC<ResultViewProps> = ({ result, onReset, age }) => {
  
  // Custom label rendering for the Pie Chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6; // Position inside or *1.2 for outside
    
    // Only show label if slice is significant (> 4%)
    if (percent < 0.04) return null;

    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-[10px] md:text-xs font-bold drop-shadow-md"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">The Verdict</h2>
        <p className="text-slate-500">Based on your {age} years of existence and emotional baggage.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Chart Section */}
        <div className="w-full md:w-2/3 h-[400px] md:h-[500px] bg-slate-50 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={result.slices}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius="80%"
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {result.slices.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-400">
            * Calculations are approximate and scientifically humorous.
          </div>
        </div>

        {/* Legend / Details Section */}
        <div className="w-full md:w-1/3 p-6 md:border-l border-slate-100 flex flex-col">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                Breakdown
            </h3>
            
            <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {result.slices.map((slice, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-100 overflow-hidden hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-2">
                                <span 
                                    className="w-3 h-3 rounded-full shadow-sm shrink-0" 
                                    style={{ backgroundColor: slice.fill }}
                                />
                                <span className="font-medium text-slate-700 text-sm truncate max-w-[120px]" title={slice.name}>
                                    {slice.name}
                                </span>
                            </div>
                            <span className="font-mono text-sm font-bold text-slate-900">{slice.value}%</span>
                        </div>
                        {slice.sources && (slice.sources.time != null || slice.sources.bloodline != null || slice.sources.emotion != null) && (
                            <div className="px-2 pb-2 pt-0 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                {slice.sources.time != null && slice.sources.time > 0 && (
                                    <span className="text-slate-500">
                                        <span className="font-medium text-slate-600">Time</span>
                                        <span className="font-mono text-blue-600 ml-1">{slice.sources.time}%</span>
                                    </span>
                                )}
                                {slice.sources.bloodline != null && slice.sources.bloodline > 0 && (
                                    <span className="text-slate-500">
                                        <span className="font-medium text-slate-600">Bloodline</span>
                                        <span className="font-mono text-pink-600 ml-1">{slice.sources.bloodline}%</span>
                                    </span>
                                )}
                                {slice.sources.emotion != null && slice.sources.emotion > 0 && (
                                    <span className="text-slate-500">
                                        <span className="font-medium text-slate-600">Emotion</span>
                                        <span className="font-mono text-amber-600 ml-1">{slice.sources.emotion}%</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="text-xs text-slate-400 mb-4">
                    <p>Time Impact: {result.totalTimePercentage.toFixed(1)}%</p>
                    <p>Bloodline/Emotion Impact: {result.remainingPercentage.toFixed(1)}%</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={onReset}
                        className="flex items-center justify-center px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-medium"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Start Over
                    </button>
                    <button 
                         onClick={() => alert("Screenshot this and send it to your mom!")}
                         className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
