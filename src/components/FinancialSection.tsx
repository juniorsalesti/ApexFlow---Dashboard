import React, { useState, useMemo } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Plus, DollarSign, Calendar, Tag, FileText, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { formatCurrency, cn } from '../lib/utils';
import { addFinancialEntry, updateFinancialEntry, deleteFinancialEntry } from '../services/db';

interface FinancialSectionProps {
  financial: any[];
}

export function FinancialSection({ financial }: FinancialSectionProps) {
  const { selectedCompanyId, companies } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    category: 'Tráfego Pago',
    value: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    companyId: ''
  });

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = selectedCompanyId || formData.companyId;
    if (!companyId) {
      alert('Por favor, selecione uma empresa para vincular esta transação.');
      return;
    }
    setLoading(true);
    try {
      if (selectedEntry) {
        await updateFinancialEntry(selectedEntry.id, {
          ...formData,
          value: Number(formData.value)
        });
      } else {
        await addFinancialEntry({
          ...formData,
          value: Number(formData.value)
        }, companyId);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      type: 'income', 
      category: 'Tráfego Pago', 
      value: 0, 
      date: new Date().toISOString().split('T')[0], 
      description: '',
      companyId: ''
    });
    setSelectedEntry(null);
  };

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setFormData({
      type: entry.type,
      category: entry.category,
      value: entry.value,
      date: entry.date.split('T')[0],
      description: entry.description || '',
      companyId: entry.companyId
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await deleteFinancialEntry(id);
    } catch (error) {
      console.error(error);
    }
  };

  // Process data for charts
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    const data = months.map((month, index) => {
      const monthEntries = financial.filter(f => {
        const d = new Date(f.date);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      });

      const revenue = monthEntries.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0);
      const expenses = monthEntries.reduce((acc, curr) => acc + (curr.type === 'expense' ? curr.value : 0), 0);
      
      return { month, revenue, expenses, mrr: 0 }; // MRR could be added if needed
    });

    return data.slice(0, new Date().getMonth() + 1);
  }, [financial]);

  const categoryData = useMemo(() => {
    const counts = financial.reduce((acc: any, curr) => {
      if (curr.type === 'income') {
        acc[curr.category] = (acc[curr.category] || 0) + curr.value;
      }
      return acc;
    }, {});

    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value: value as number,
      color: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'][index % 5]
    }));
  }, [financial]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Gestão Financeira</h3>
        <button 
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Nova Transação
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Evolução do Faturamento" subtitle="Evolução mensal real" className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value / 1000}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Receita por Serviço" subtitle="Distribuição percentual">
          <div className="h-[300px] w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.length > 0 ? categoryData : [{ name: 'Sem dados', value: 1, color: '#f1f5f9' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 w-full">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Lançamentos Recentes" subtitle="Últimas transações registradas" className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {financial.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(entry.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.description || 'Sem descrição'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{entry.category}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={entry.type === 'income' ? 'success' : 'risk'}>
                        {entry.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </td>
                    <td className={cn(
                      "px-4 py-4 text-sm font-bold",
                      entry.type === 'income' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {entry.type === 'income' ? '+' : '-'} {formatCurrency(entry.value)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(entry)}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </button>
                        <button 
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400 dark:text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {financial.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                      Nenhuma transação registrada ainda.
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
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }} 
        title={selectedEntry ? "Editar Transação" : "Nova Transação"}
      >
        <form onSubmit={handleSaveEntry} className="space-y-4">
          {!selectedCompanyId && !selectedEntry && (
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Vincular à Empresa</label>
              <select 
                required
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="">Selecione uma empresa...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="Tráfego Pago">Tráfego Pago</option>
                <option value="Social Media">Social Media</option>
                <option value="IA">IA</option>
                <option value="Sites">Sites</option>
                <option value="Branding">Branding</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Valor (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="number" 
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm min-h-[80px] dark:text-white"
                placeholder="Detalhes da transação..."
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Salvando...' : (selectedEntry ? 'Atualizar Transação' : 'Registrar Transação')}
          </button>
        </form>
      </Modal>
    </div>
  );
}
