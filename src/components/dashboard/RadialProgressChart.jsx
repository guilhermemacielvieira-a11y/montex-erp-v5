import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, FileText, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RadialProgressChart({ progressoMedio, projetosAtivos, orcamentosAbertos }) {
  const circumference = 2 * Math.PI * 45;
  const progressOffset = circumference - (progressoMedio / 100) * circumference;

  return (
    <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          Visão Geral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Radial Progress */}
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-48 h-48">
              {/* Background Circle */}
              <circle
                cx="96"
                cy="96"
                r="45"
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                className="text-slate-700"
              />
              {/* Progress Circle */}
              <motion.circle
                cx="96"
                cy="96"
                r="45"
                stroke="url(#gradient)"
                strokeWidth="10"
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: progressOffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{progressoMedio.toFixed(0)}%</span>
              <span className="text-sm text-slate-400">Progresso Médio</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-500 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Projetos Ativos</p>
                  <p className="text-2xl font-bold text-white">{projetosAtivos}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-orange-500/10 to-transparent border-l-4 border-orange-500 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Orçamentos Abertos</p>
                  <p className="text-2xl font-bold text-white">{orcamentosAbertos}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-purple-500/10 to-transparent border-l-4 border-purple-500 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Eficiência</p>
                  <p className="text-2xl font-bold text-white">
                    {progressoMedio > 70 ? 'Alta' : progressoMedio > 40 ? 'Média' : 'Baixa'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}