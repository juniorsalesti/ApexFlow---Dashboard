import { Card } from './ui/Card';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, Target, Users, Zap } from 'lucide-react';

interface GrowthSectionProps {
  clients: any[];
  projects: any[];
  financial: any[];
}

export function GrowthSection({ clients, projects, financial }: GrowthSectionProps) {
  const currentRevenue = financial
    .filter(f => f.type === 'income')
    .reduce((acc, curr) => acc + curr.value, 0);

  const activeClients = clients.filter(c => c.status === 'active').length;
  const averageTicket = activeClients > 0 ? currentRevenue / activeClients : 0;

  // Mock CAC and LTV for now as they require historical data
  const cac = 0;
  const ltv = averageTicket * 12; // Assuming 12 months retention
  const ltvCacRatio = cac > 0 ? (ltv / cac).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card title="Lifetime Value (LTV)" subtitle="Valor médio por cliente">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl transition-colors">
            <TrendingUp className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{formatCurrency(ltv)}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">Baseado no ticket médio</p>
          </div>
        </div>
      </Card>

      <Card title="Custo de Aquisição (CAC)" subtitle="Investimento por novo cliente">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl transition-colors">
            <Target className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{formatCurrency(cac)}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">Sem dados históricos</p>
          </div>
        </div>
      </Card>

      <Card title="Relação LTV/CAC" subtitle="Eficiência de aquisição">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl transition-colors">
            <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{ltvCacRatio}x</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors">Ideal: acima de 3x</p>
          </div>
        </div>
      </Card>

      <Card title="Receita Média" subtitle="Por cliente (ARPU)">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl transition-colors">
            <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{formatCurrency(averageTicket)}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">Média por cliente ativo</p>
          </div>
        </div>
      </Card>

      <Card title="Previsão de Faturamento (Forecast)" subtitle="Próximos 3 meses" className="lg:col-span-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white relative overflow-hidden transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-24 h-24" />
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Abril (Projetado)</p>
            <h4 className="text-3xl font-bold mt-2">{formatCurrency(currentRevenue)}</h4>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-semibold">Crescimento de 0%</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800 dark:bg-slate-900 text-white relative overflow-hidden transition-colors">
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Maio (Projetado)</p>
            <h4 className="text-3xl font-bold mt-2">{formatCurrency(currentRevenue)}</h4>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-semibold">Crescimento de 0%</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-700 dark:bg-slate-950 text-white relative overflow-hidden transition-colors">
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Junho (Projetado)</p>
            <h4 className="text-3xl font-bold mt-2">{formatCurrency(currentRevenue)}</h4>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-semibold">Crescimento de 0%</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
