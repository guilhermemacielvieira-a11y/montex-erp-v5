import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function ModernCard({ children, className, gradient, delay = 0, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "relative bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden group",
        "hover:border-slate-600/50 transition-all duration-300",
        className
      )}
      {...props}
    >
      {gradient && (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity",
          gradient
        )} />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

export function ModernCardHeader({ children, className }) {
  return (
    <div className={cn("p-6 border-b border-slate-800", className)}>
      {children}
    </div>
  );
}

export function ModernCardTitle({ children, className, icon: Icon }) {
  return (
    <h3 className={cn("text-xl font-bold text-white flex items-center gap-2", className)}>
      {Icon && <Icon className="h-5 w-5 text-orange-500" />}
      {children}
    </h3>
  );
}

export function ModernCardContent({ children, className }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}