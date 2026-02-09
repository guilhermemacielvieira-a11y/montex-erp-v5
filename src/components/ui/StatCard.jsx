import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  className,
  iconClassName 
}) {
  return (
    <div className={cn(
      "bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-slate-400 text-sm">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend === 'up' ? 'text-emerald-600' : 'text-red-500'
            )}>
              <span>{trend === 'up' ? '↑' : '↓'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center",
            iconClassName || "bg-gradient-to-br from-orange-400 to-orange-600"
          )}>
            <Icon className="h-7 w-7 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}