import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { formatPercent } from '../lib/utils';
import { addCommercialStats } from '../services/db';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { ArrowRight, Users, MessageSquare, FileText, CheckCircle, Plus, Target } from 'lucide-react';

interface CommercialSectionProps {
  commercial: any[];
}

export function CommercialSection({ commercial }: CommercialSectionProps) {
  const { selectedCompanyId } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().toLocaleString('default', { month: 'short' }),
    leads: 0,
    meetings: 0,
    proposals: 0,
    sales: 0
  });

  const handleAddStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      alert('Selecione uma empresa específica para atualizar as métricas.');
      return;
    }
    setLoading(true);
    try {
      const conversionRate = formData.leads > 0 ? (formData.sales / formData.leads) * 100 : 0;
      await addCommercialStats({
        ...formData,
        conversionRate
      }, selectedCompanyId);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Use the latest commercial stats or default to zero
  const latestStats = commercial[commercial.length - 1] || {
    leads: 0,
    meetings: 0,
    proposals: 0,
    sales: 0,
    conversionRate: 0
  };

  const funnelData = [
    { name: 'Leads', value: latestStats.leads, icon: Users, color: '#8b5cf6' },
    { name: 'Reuniões', value: latestStats.meetings, icon: MessageSquare, color: '#a78bfa' },
    { name: 'Propostas', value: latestStats.proposals, icon: FileText, color: '#c4b5fd' },
    { name: 'Fechamentos', value: latestStats.sales, icon: CheckCircle, color: '#ddd6fe' },
  ];

  const monthlyData = [
    { month: 'Jan', leads: 0, sales: 0 },
    { month: 'Fev', leads: 0, sales: 0 },
    { month: 'Mar', leads: 0, sales: 0 },
    { month: 'Abr', leads: latestStats.leads, sales: latestStats.sales },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Performance Comercial</h3>
        <button 
          onClick={() => {
            if (!selectedCompanyId) {
              alert('Selecione uma empresa específica para atualizar métricas.');
              return;
            }
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Atualizar Métricas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Funil de Vendas" subtitle="Conversão por etapa do funil" className="lg:col-span-2">
          <div className="flex flex-col md:flex-row items-center gap-8 py-4">
            <div className="flex-1 w-full space-y-4">
              {funnelData.map((step, i) => (
                <div key={step.name} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <step.icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{step.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{step.value}</span>
                  </div>
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                    <div 
                      className="h-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${(step.value / (funnelData[0].value || 1)) * 100}%`,
                        backgroundColor: step.color
                      }}
                    ></div>
                    {i > 0 && (
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-[10px] font-bold text-white drop-shadow-sm">
                          {((step.value / (funnelData[i-1].value || 1)) * 100).toFixed(0)}% conv.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full md:w-48 p-6 bg-violet-50 dark:bg-violet-900/20 rounded-2xl border border-violet-100 dark:border-violet-900/30 flex flex-col items-center justify-center text-center transition-colors">
              <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2">Conversão Geral</p>
              <h3 className="text-4xl font-black text-violet-900 dark:text-violet-100">{formatPercent(latestStats.conversionRate)}</h3>
              <p className="text-xs text-violet-500 dark:text-violet-400/70 mt-2">Leads para Vendas</p>
              <div className="mt-6 p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                <ArrowRight className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Performance Comercial" subtitle="Leads vs Vendas mensais">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Bar dataKey="leads" name="Leads" fill="currentColor" className="text-slate-200 dark:text-slate-700" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" name="Vendas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Atualizar Métricas Comerciais"
      >
        <form onSubmit={handleAddStats} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Leads</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="number" 
                  value={formData.leads}
                  onChange={(e) => setFormData({ ...formData, leads: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Reuniões</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="number" 
                  value={formData.meetings}
                  onChange={(e) => setFormData({ ...formData, meetings: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Propostas</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="number" 
                  value={formData.proposals}
                  onChange={(e) => setFormData({ ...formData, proposals: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Vendas</label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input 
                  type="number" 
                  value={formData.sales}
                  onChange={(e) => setFormData({ ...formData, sales: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Métricas'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
