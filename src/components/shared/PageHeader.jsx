import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Page Header Component
 *
 * Standardized header for pages with title, description, and action buttons.
 * Provides consistent visual hierarchy and spacing across all pages.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {string} [props.description] - Optional subtitle/description
 * @param {React.ReactNode} [props.actions] - Action buttons/controls (right side)
 * @param {string} [props.className] - Additional CSS classes for container
 * @param {boolean} [props.showBorder=true] - Show bottom border separator
 *
 * @returns {React.ReactElement} Page header component
 *
 * @example
 * <PageHeader
 *   title="Produção"
 *   description="Kanban de produção integrado"
 *   actions={
 *     <>
 *       <Button>Novo Item</Button>
 *       <Button>Exportar</Button>
 *     </>
 *   }
 * />
 *
 * @example
 * // Simple header without description
 * <PageHeader title="Dashboard" />
 */
export default function PageHeader({
  title,
  description = '',
  actions,
  className = '',
  showBorder = true
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'mb-6 flex items-start justify-between',
        showBorder && 'pb-6 border-b border-slate-800',
        className
      )}
    >
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-white mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-slate-400 text-sm">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3 ml-6 flex-shrink-0">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
