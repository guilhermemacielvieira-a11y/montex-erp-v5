import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function ModernButton({ children, className, gradient = 'from-orange-500 to-orange-600', icon: Icon, ...props }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        className={cn(
          "relative overflow-hidden bg-gradient-to-r text-white font-semibold shadow-lg",
          `${gradient}`,
          "hover:shadow-xl transition-all duration-300",
          className
        )}
        {...props}
      >
        <div className="relative z-10 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {children}
        </div>
        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </Button>
    </motion.div>
  );
}