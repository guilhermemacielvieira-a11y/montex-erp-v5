/**
 * Shared Components Export Index
 *
 * Central export point for all reusable components across MONTEX ERP.
 * Components are organized by purpose and can be imported individually
 * or all at once.
 *
 * @example
 * // Import individual components
 * import { KPICard, StatCard } from '@/components/shared';
 *
 * // Or import specific component
 * import KPICard from '@/components/shared/KPICard';
 */

// KPI and Stats Components
export { default as KPICard } from './KPICard';
export { default as StatCard } from './StatCard';

// Page Layout Components
export { default as PageHeader } from './PageHeader';

// Data Components
export { default as DataTable } from './DataTable';
export { default as FilterBar } from './FilterBar';

/**
 * Component Directory
 *
 * KPICard - Display key performance indicators with trends
 *   Usage: Dashboards, overview sections, metric displays
 *   Props: label, value, trend, icon, color, unit
 *
 * StatCard - Simplified stat display (minimal version of KPICard)
 *   Usage: Compact layouts, sidebar widgets, summary cards
 *   Props: label, value, color, size
 *
 * PageHeader - Standardized page header with title and actions
 *   Usage: Top of every page for consistency
 *   Props: title, description, actions
 *
 * DataTable - Full-featured table with search, sort, and pagination
 *   Usage: List views, inventory management, production tracking
 *   Props: data, columns, rowActions, pageSize
 *
 * FilterBar - Reusable filter interface for data
 *   Usage: Above tables and lists for filtering
 *   Props: onFiltersChange, categories, showDateRange
 */
