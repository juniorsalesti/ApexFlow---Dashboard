import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { formatCurrency } from '../lib/utils';
import { addClient } from '../services/db';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MoreHorizontal, UserPlus, UserMinus, Users, Briefcase, Plus, Building2, Mail, Phone, CheckCircle2 } from 'lucide-react';

interface ClientSectionProps {
  clients: any[];
  projects: any[];
  contracts: any[];
}

export function ClientSection({ clients, projects, contracts }: ClientSectionProps) {
  const { selectedCompanyId } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    status: 'active',
    type: 'recurrent'
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      alert('Selecione uma empresa específica para adicionar um cliente.');
      return;
    }
    setLoading(true);
    try {
      await addClient(formData, selectedCompanyId);
      setIsModalOpen(false);
      setFormData({ name: '', company: '', status: 'active', type: 'recurrent' });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Mock historical data for the chart (since we don't have historical snapshots in Firestore yet)
  const chartData = [
    { month: 'Jan', clients: 24 },
    { month: 'Fev', clients: 28 },
    { month: 'Mar', clients: 32 },
    { month: 'Abr', clients: clients.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Gestão de Clientes</h3>
        <button 
          onClick={() => {
            if (!selectedCompanyId) {
              alert('Selecione uma empresa específica para adicionar clientes.');
              return;
            }
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Base de Clientes" subtitle="Crescimento histórico" className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                <Area 
                  type="monotone" 
                  dataKey="clients" 
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorClients)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <UserPlus className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Novos</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">4</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Últimos 30 dias</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
                <UserMinus className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Churn</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Taxa de 0%</p>
            </div>
          </div>

          <Card title="Alertas de Risco" subtitle="Clientes com baixa saúde">
            <div className="space-y-4">
              {clients.filter(c => c.status === 'risk' || c.status === 'attention').length > 0 ? (
                clients.filter(c => c.status === 'risk' || c.status === 'attention').map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{client.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{client.company}</p>
                    </div>
                    <Badge variant={client.status}>{client.status === 'risk' ? 'Crítico' : 'Atenção'}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-20" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum cliente em risco no momento.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card title="Ranking de Clientes" subtitle="Por faturamento mensal" className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Projetos</th>
                  <th className="px-4 py-3">Faturamento</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {clients.map((client) => {
                  const clientProjects = projects.filter(p => p.clientId === client.id);
                  const clientContracts = contracts.filter(c => c.clientId === client.id);
                  const monthlyRevenue = clientContracts.reduce((acc, curr) => acc + (curr.monthlyValue || 0), 0);
                  
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                            {client.name.substring(0, 2)}
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{client.company}</td>
                      <td className="px-4 py-4">
                        <Badge variant={client.status}>{client.status}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        {clientProjects.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 text-violet-500 dark:text-violet-400" />
                            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{clientProjects.length}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(monthlyRevenue)}</td>
                      <td className="px-4 py-4 text-right">
                        <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                      Nenhum cliente cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Cadastrar Novo Cliente"
      >
        <form onSubmit={handleAddClient} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome do Contato</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                placeholder="Ex: João Silva"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Empresa</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                placeholder="Ex: Apex Tech"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tipo de Cliente</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="recurrent">Recorrente</option>
                <option value="project">Projeto</option>
                <option value="both">Ambos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Status Inicial</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="active">Ativo</option>
                <option value="attention">Atenção</option>
                <option value="risk">Risco</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Cadastrar Cliente'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
