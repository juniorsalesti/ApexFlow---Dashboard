import { cn } from '@/src/lib/utils';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'healthy' | 'attention' | 'risk' | 'default' | 'success' | 'danger';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    healthy: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    attention: 'bg-amber-50 text-amber-700 border-amber-100',
    risk: 'bg-rose-50 text-rose-700 border-rose-100',
    default: 'bg-slate-50 text-slate-700 border-slate-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    danger: 'bg-rose-50 text-rose-700 border-rose-100',
  };

  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
