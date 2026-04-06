import React, { useMemo } from 'react';
import { DollarSign, Users, TrendingUp, CreditCard, Briefcase, PieChart } from 'lucide-react';
import { StatCard } from './ui/StatCard';
import { Card } from './ui/Card';
import { formatPercent, formatCurrency } from '../lib/utils';

interface OverviewSectionProps {
  clients: any[];
  projects: any[];
  contracts: any[];
  financial: any[];
  allFinancial: any[];
  selectedMonth: number;
  selectedYear: number;
  period: string;
}

export function OverviewSection({ 
  clients, 
  projects, 
  contracts, 
  financial, 
  allFinancial,
  selectedMonth,
  selectedYear,
  period
}: OverviewSectionProps) {
  const metrics = useMemo(() => {
    const now = new Date();
    let targetMonth = selectedMonth;
    let targetYear = selectedYear;

    if (period !== 'Personalizado') {
      targetMonth = now.getMonth();
      targetYear = now.getFullYear();
    }

    const lastMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    const lastMonthYear = targetMonth === 0 ? targetYear - 1 : targetYear;

    // Current period revenue (from filtered financial)
    const currentRevenue = financial.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0);

    // Last month revenue for growth calculation
    const lastMonthEntries = allFinancial.filter(f => {
      const d = new Date(f.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });
    const lastRevenue = lastMonthEntries.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0);

    const growth = lastRevenue > 0 
      ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 
      : (currentRevenue > 0 && lastRevenue === 0 ? 100 : 0);

    const activeClientsCount = clients.filter(c => c.status === 'active').length;
    
    // MRR: Sum of monthlyValue of all active contracts
    const mrr = contracts
      .filter(c => c.status === 'active')
      .reduce((acc, curr) => acc + (Number(curr.monthlyValue) || 0), 0);

    const projectRevenue = financial.reduce((acc, curr) => {
      if (curr.type === 'income') {
        const categories = curr.categories || (curr.category ? [curr.category] : []);
        const projectCategories = categories.filter((cat: string) => 
          ['Sites', 'Landing Page', 'Branding', 'Automação'].includes(cat)
        );
        
        if (projectCategories.length > 0) {
          const portion = projectCategories.length / categories.length;
          return acc + (curr.value * portion);
        }
      }
      return acc;
    }, 0);

    const totalRevenue = currentRevenue;
    
    // Ticket Médio = Faturamento Total / Clientes Ativos
    const averageTicket = activeClientsCount > 0 ? totalRevenue / activeClientsCount : 0;
    
    const recurrentPercent = totalRevenue > 0 ? (mrr / totalRevenue) * 100 : 0;
    const projectPercent = totalRevenue > 0 ? (projectRevenue / totalRevenue) * 100 : 0;

    // Ranking of clients by revenue in the period
    const clientRevenueMap = financial.reduce((acc: any, curr) => {
      if (curr.type === 'income' && curr.clientId) {
        acc[curr.clientId] = (acc[curr.clientId] || 0) + curr.value;
      }
      return acc;
    }, {});

    const clientRanking = Object.entries(clientRevenueMap)
      .map(([clientId, revenue]) => ({
        clientId,
        revenue: revenue as number,
        client: clients.find(c => c.id === clientId)
      }))
      .filter(item => item.client)
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      mrr,
      activeClients: activeClientsCount,
      growth,
      averageTicket,
      projectRevenue,
      recurrentPercent,
      projectPercent,
      clientRanking
    };
  }, [clients, projects, contracts, financial, allFinancial, selectedMonth, selectedYear, period]);

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
        <StatCard 
          title="Receita Total (Acumulada)" 
          value={financial.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0)} 
          icon={DollarSign} 
          isCurrency 
          className="bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/30 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Ranking de Clientes" subtitle="Faturamento por cliente no período">
          <div className="space-y-4">
            {metrics.clientRanking.length > 0 ? (
              metrics.clientRanking.slice(0, 5).map((item, index) => (
                <div key={item.clientId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.client.company}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.client.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.revenue)}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{formatPercent((item.revenue / metrics.totalRevenue) * 100)} do total</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-sm text-slate-400 dark:text-slate-600 italic">Nenhuma transação vinculada a clientes no período.</p>
              </div>
            )}
            {metrics.clientRanking.length > 5 && (
              <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 uppercase font-bold tracking-widest">Exibindo top 5 de {metrics.clientRanking.length} clientes</p>
            )}
          </div>
        </Card>

        <Card title="Insights de Receita" subtitle="Análise de concentração e lucratividade">
          <div className="space-y-6">
            <div className="p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/20 rounded-xl">
              <h5 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-3">Concentração de Receita</h5>
              {metrics.clientRanking.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Top Cliente ({metrics.clientRanking[0].client.company})</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatPercent((metrics.clientRanking[0].revenue / metrics.totalRevenue) * 100)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-violet-500" 
                      style={{ width: `${(metrics.clientRanking[0].revenue / metrics.totalRevenue) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    { (metrics.clientRanking[0].revenue / metrics.totalRevenue) > 0.4 
                      ? "⚠️ Alta dependência: Um único cliente representa mais de 40% da sua receita." 
                      : "✅ Boa distribuição: Sua receita não está excessivamente concentrada em um único cliente."}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Vincule transações a clientes para ver a análise de concentração.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ticket Médio / Cliente</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.averageTicket)}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clientes Pagantes</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{metrics.clientRanking.length}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
