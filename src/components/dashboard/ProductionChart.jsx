import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - será substituído por dados reais
const mockData = [
  { mes: 'Jul', fabricacao: 320, montagem: 280, meta: 350 },
  { mes: 'Ago', fabricacao: 380, montagem: 320, meta: 350 },
  { mes: 'Set', fabricacao: 420, montagem: 380, meta: 400 },
  { mes: 'Out', fabricacao: 390, montagem: 350, meta: 400 },
  { mes: 'Nov', fabricacao: 450, montagem: 420, meta: 450 },
  { mes: 'Dez', fabricacao: 480, montagem: 440, meta: 450 },
  { mes: 'Jan', fabricacao: 385, montagem: 340, meta: 500 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-400">{entry.name}:</span>
            <span className="text-white font-medium">{entry.value} ton</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ProductionChart({ data = mockData }) {
  const [chartType, setChartType] = useState('area');
  const [period, setPeriod] = useState('6m');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Produção & Montagem
            </h3>
            <p className="text-sm text-slate-400">Evolução mensal em toneladas</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Period Selector */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              {['3m', '6m', '1a'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    period === p
                      ? "bg-emerald-500 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Chart Type Selector */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              {[
                { id: 'area', icon: TrendingUp },
                { id: 'bar', icon: BarChart3 },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    chartType === type.id
                      ? "bg-emerald-500 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <type.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="fabricacaoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="montagemGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="mes"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="fabricacao"
                  name="Fabricação"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#fabricacaoGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="montagem"
                  name="Montagem"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#montagemGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="meta"
                  name="Meta"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="transparent"
                />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="mes"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => (
                    <span className="text-slate-300 text-sm">{value}</span>
                  )}
                />
                <Bar
                  dataKey="fabricacao"
                  name="Fabricação"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="montagem"
                  name="Montagem"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-400">Fabricação</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <span className="text-sm text-slate-400">Montagem</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm text-slate-400">Meta</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
