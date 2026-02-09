import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ModernStatCard({ title, value, subtitle, icon: Icon, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="relative group"
    >
      {/* Glow Effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500",
        gradient
      )} />
      
      {/* Card */}
      <div className="relative bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 overflow-hidden group-hover:border-slate-600/50 transition-all">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Content */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-400 font-medium">{title}</p>
              <h3 className="text-3xl font-bold text-white">{value}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
            
            {/* Icon with Gradient */}
            <div className={cn(
              "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
              gradient,
              "group-hover:scale-110 transition-transform duration-300"
            )}>
              <Icon className="h-7 w-7 text-white" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full bg-gradient-to-r rounded-full", gradient)}
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ delay: delay + 0.3, duration: 1 }}
            />
          </div>
        </div>

        {/* Decorative Circle */}
        <div className={cn(
          "absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-br opacity-10",
          gradient
        )} />
      </div>
    </motion.div>
  );
}