import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Breadcrumbs({ items, className }) {
  return (
    <nav className={cn("flex items-center space-x-2 text-sm", className)}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center"
      >
        <Link
          to={createPageUrl('Dashboard')}
          className="flex items-center gap-1 text-slate-400 hover:text-orange-500 transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Início</span>
        </Link>
      </motion.div>

      {items?.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-slate-600" />
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (index + 1) * 0.1 }}
          >
            {item.href ? (
              <Link
                to={createPageUrl(item.href)}
                className="text-slate-400 hover:text-orange-500 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-white font-medium">{item.label}</span>
            )}
          </motion.div>
        </React.Fragment>
      ))}
    </nav>
  );
}