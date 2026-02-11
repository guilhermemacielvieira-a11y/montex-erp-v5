/**
 * PerformanceRadar - Wrapper standardizado para Recharts RadarChart
 *
 * Props:
 *   - data: array de { subject, value, fullMark }
 *   - subjects: array de rótulos (opcional - usa data[].subject se não fornecido)
 *   - color: cor principal do radar (default: '#c084fc')
 *   - size: altura do gráfico (default: 200)
 *   - className: classes Tailwind adicionais
 */
import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import ChartWrapper from './ChartWrapper';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

export default function PerformanceRadar({
  data = [],
  subjects = [],
  color = '#c084fc',
  size = 200,
  className = '',
  title = 'Desempenho',
  icon: Icon = Zap,
}) {
  if (!data || data.length === 0) {
    return (
      <ChartWrapper
        title={title}
        icon={Icon}
        iconColor={color}
        height={size}
        empty
        className={className}
      />
    );
  }

  return (
    <ChartWrapper
      title={title}
      icon={Icon}
      iconColor={color}
      height={size}
      color={color}
      className={className}
    >
      <RadarChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#94a3b8' }} />
        <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Radar
          name="Performance"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.25}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </RadarChart>
    </ChartWrapper>
  );
}
