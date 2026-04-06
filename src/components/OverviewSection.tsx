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
  const activeClients = clients.filter(c => c.status === 'active').length;
  
  const mrr = contracts
    .filter(c => c.status === 'active')
    .reduce((acc, curr) => acc + (curr.monthlyValue || 0), 0);

  const projectRevenue = projects
    .filter(p => p.status === 'delivered')
    .reduce((acc, curr) => acc + (curr.value || 0), 0);

  const totalRevenue = mrr + projectRevenue;
  const averageTicket = activeClients > 0 ? totalRevenue / activeClients : 0;
  
  const recurrentPercent = totalRevenue > 0 ? (mrr / totalRevenue) * 100 : 0;
  const projectPercent = totalRevenue > 0 ? (projectRevenue / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Faturamento Mensal" 
          value={totalRevenue} 
          icon={DollarSign} 
          trend={0} 
          isCurrency 
        />
        <StatCard 
          title="Receita Recorrente (MRR)" 
          value={mrr} 
          icon={CreditCard} 
          trend={0} 
          isCurrency 
        />
        <StatCard 
          title="Clientes Ativos" 
          value={activeClients} 
          icon={Users} 
          trend={0} 
        />
        <StatCard 
          title="Crescimento Mensal" 
          value={0} 
          icon={TrendingUp} 
          isPercent 
        />
        <StatCard 
          title="Ticket Médio" 
          value={averageTicket} 
          icon={Users} 
          isCurrency 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Receita de Projetos" 
          value={projectRevenue} 
          icon={Briefcase} 
          isCurrency 
          className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors"
        />
        <StatCard 
          title="Receita Total" 
          value={totalRevenue} 
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
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 transition-colors">{formatPercent(recurrentPercent)}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase transition-colors">Recorrente</span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 transition-colors"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">{formatPercent(projectPercent)}</span>
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
                  strokeDasharray={`${recurrentPercent} 100`}
                ></circle>
             </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
