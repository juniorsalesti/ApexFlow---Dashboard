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
  allFinancial: any[];
  clients: any[];
  selectedMonth: number;
  selectedYear: number;
  period: string;
}

export function FinancialSection({ financial, allFinancial, clients, selectedMonth, selectedYear, period }: FinancialSectionProps) {
  const { selectedCompanyId, companies } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    categories: ['Tráfego Pago'] as string[],
    value: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    companyId: '',
    clientId: ''
  });

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = selectedCompanyId || formData.companyId;
    if (!companyId) {
      return;
    }
    if (formData.categories.length === 0) {
      return;
    }
    setLoading(true);
    try {
      const data = {
        ...formData,
        value: Number(formData.value),
        category: formData.categories[0], // Keep for backward compatibility
      };

      if (selectedEntry) {
        await updateFinancialEntry(selectedEntry.id, data);
      } else {
        await addFinancialEntry(data, companyId);
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
      categories: ['Tráfego Pago'], 
      value: 0, 
      date: new Date().toISOString().split('T')[0], 
      description: '',
      companyId: '',
      clientId: ''
    });
    setSelectedEntry(null);
  };

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setFormData({
      type: entry.type,
      categories: entry.categories || (entry.category ? [entry.category] : []),
      value: entry.value,
      date: entry.date.split('T')[0],
      description: entry.description || '',
      companyId: entry.companyId,
      clientId: entry.clientId || ''
    });
    setIsModalOpen(true);
  };

  const toggleCategory = (cat: string) => {
    setFormData(prev => {
      const categories = prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories };
    });
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteFinancialEntry(entryToDelete);
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  // Process data for charts
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = [];

    if (period === 'Personalizado') {
      // Show all months of the selected year
      for (let m = 0; m < 12; m++) {
        const monthEntries = allFinancial.filter(f => {
          const entryDate = new Date(f.date);
          return entryDate.getMonth() === m && entryDate.getFullYear() === selectedYear;
        });

        const revenue = monthEntries.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0);
        const expenses = monthEntries.reduce((acc, curr) => acc + (curr.type === 'expense' ? curr.value : 0), 0);
        
        data.push({ 
          month: months[m], 
          revenue, 
          expenses 
        });
      }
    } else {
      // Show last 12 months trend from now
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        
        const monthEntries = allFinancial.filter(f => {
          const entryDate = new Date(f.date);
          return entryDate.getMonth() === m && entryDate.getFullYear() === y;
        });

        const revenue = monthEntries.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.value : 0), 0);
        const expenses = monthEntries.reduce((acc, curr) => acc + (curr.type === 'expense' ? curr.value : 0), 0);
        
        data.push({ 
          month: months[m], 
          revenue, 
          expenses 
        });
      }
    }

    return data;
  }, [allFinancial, selectedYear, period]);

  const categoryData = useMemo(() => {
    const counts = financial.reduce((acc: any, curr) => {
      if (curr.type === 'income') {
        const categories = curr.categories || (curr.category ? [curr.category] : ['Outros']);
        const splitValue = curr.value / categories.length;
        categories.forEach((cat: string) => {
          acc[cat] = (acc[cat] || 0) + splitValue;
        });
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
                  <th className="px-4 py-3">Cliente</th>
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
                      {entry.clientId ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded flex items-center justify-center text-[10px] font-bold text-violet-600 dark:text-violet-400">
                            {clients.find(c => c.id === entry.clientId)?.name?.substring(0, 2) || 'CL'}
                          </div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {clients.find(c => c.id === entry.clientId)?.name || 'Cliente removido'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-600 italic">Geral</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(entry.categories || [entry.category]).map((cat: string) => (
                          <span key={cat} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md font-medium">
                            {cat}
                          </span>
                        ))}
                      </div>
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
                          onClick={() => {
                            setEntryToDelete(entry.id);
                            setIsDeleteModalOpen(true);
                          }}
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

          <div className="grid grid-cols-1 gap-4">
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
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Categorias (Selecione uma ou mais)</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Tráfego Pago', 'Social Media', 'IA', 'Sites', 'Branding', 'Hospedagem', 'Outros'].map(cat => (
                  <label key={cat} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-violet-500 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={formData.categories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">{cat}</span>
                  </label>
                ))}
              </div>
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
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Cliente (Opcional)</label>
            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <select 
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="">Nenhum cliente (Geral)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                ))}
              </select>
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

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Transação"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
            <p className="text-sm text-rose-800 dark:text-rose-400">
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 dark:shadow-none"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
