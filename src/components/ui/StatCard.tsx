import { cn, formatCurrency, formatPercent } from '@/src/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  isCurrency?: boolean;
  isPercent?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, isCurrency, isPercent, className }: StatCardProps) {
  const formattedValue = isCurrency 
    ? formatCurrency(Number(value)) 
    : isPercent 
      ? formatPercent(Number(value)) 
      : value;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
          <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        {trend !== undefined && (
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
          )}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formattedValue}</h3>
      </div>
    </motion.div>
  );
}
