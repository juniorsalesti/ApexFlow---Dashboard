import React, { useMemo } from 'react';
import { DollarSign, Users, TrendingUp, CreditCard, Briefcase, PieChart } from 'lucide-react';
import { StatCard } from './ui/StatCard';
import { formatPercent } from '../lib/utils';

interface OverviewSectionProps {
  clients: any[];
  projects: any[];
  contracts: any[];
  financial: any[];
}

export function OverviewSection({ clients, projects, contracts, financial }: OverviewSectionProps) {
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthEntries = financial.filter(f => {
      const d = new Date(f.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonthEntries = financial.filter(f => {
      const d = new Date(f.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const currentRevenue = currentMonthEntries.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0);
    const lastRevenue = lastMonthEntries.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0);

    const growth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    const activeClients = clients.filter(c => c.status === 'active').length;
    
    const mrr = contracts
      .filter(c => c.status === 'active')
      .reduce((acc, curr) => acc + (curr.monthlyValue || 0), 0);

    const projectRevenue = projects
      .filter(p => p.status === 'delivered')
      .reduce((acc, curr) => acc + (curr.value || 0), 0);

    const totalRevenue = currentRevenue; // Using current month revenue for the main stat
    const averageTicket = activeClients > 0 ? mrr / activeClients : 0;
    
    const recurrentPercent = totalRevenue > 0 ? (mrr / totalRevenue) * 100 : 0;
    const projectPercent = totalRevenue > 0 ? (projectRevenue / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      mrr,
      activeClients,
      growth,
      averageTicket,
      projectRevenue,
      recurrentPercent,
      projectPercent
    };
  }, [clients, projects, contracts, financial]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Faturamento Mensal" 
          value={metrics.totalRevenue} 
          icon={DollarSign} 
          trend={metrics.growth} 
          isCurrency 
        />
        <StatCard 
          title="Receita Recorrente (MRR)" 
          value={metrics.mrr} 
          icon={CreditCard} 
          trend={0} 
          isCurrency 
        />
        <StatCard 
          title="Clientes Ativos" 
          value={metrics.activeClients} 
          icon={Users} 
          trend={0} 
        />
        <StatCard 
          title="Crescimento Mensal" 
          value={metrics.growth} 
          icon={TrendingUp} 
          isPercent 
        />
        <StatCard 
          title="Ticket Médio (MRR)" 
          value={metrics.averageTicket} 
          icon={Users} 
          isCurrency 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Receita de Projetos" 
          value={metrics.projectRevenue} 
          icon={Briefcase} 
          isCurrency 
          className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors"
        />
        <StatCard 
          title="Receita Total (Acumulada)" 
          value={financial.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0)} 
          icon={DollarSign} 
          isCurrency 
          className="bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/30 transition-colors"
        />
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
              <PieChart className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">Mix de Receita</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 transition-colors">{formatPercent(metrics.recurrentPercent)}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase transition-colors">Recorrente</span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 transition-colors"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">{formatPercent(metrics.projectPercent)}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase transition-colors">Projetos</span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 relative">
             <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800 transition-colors" strokeWidth="4"></circle>
                <circle 
                  cx="18" 
                  cy="18" 
                  r="16" 
                  fill="none" 
                  stroke="#8b5cf6" 
                  strokeWidth="4" 
                  strokeDasharray={`${metrics.recurrentPercent} 100`}
                ></circle>
             </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
