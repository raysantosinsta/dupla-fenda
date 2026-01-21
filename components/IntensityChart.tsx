import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { HistogramData } from '../types';

interface IntensityChartProps {
  data: HistogramData[];
  observerActive: boolean;
}

const IntensityChart: React.FC<IntensityChartProps> = ({ data, observerActive }) => {
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-lg text-xs">
          <p className="text-slate-200">Posição: {payload[0].payload.position}</p>
          <p className="text-cyan-400">Partículas: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-2 flex items-center justify-between">
        <span>Padrão de Intensidade na Tela</span>
        <span className={`text-xs px-2 py-0.5 rounded ${observerActive ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
          {observerActive ? 'PARTÍCULA (SOMA)' : 'ONDA (INTERFERÊNCIA)'}
        </span>
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={observerActive ? '#ef4444' : '#22d3ee'} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={observerActive ? '#ef4444' : '#22d3ee'} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="position" 
            hide 
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke={observerActive ? '#ef4444' : '#22d3ee'} 
            fillOpacity={1} 
            fill="url(#colorCount)" 
            isAnimationActive={false} // Performance optimization for frequent updates
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IntensityChart;