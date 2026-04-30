import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { formatCurrency, cn } from '../lib/utils';
import { addClient, updateClient, deleteClient, updateContract, deleteContract, addFinancialEntry, addContract, deleteFinancialEntry } from '../services/db';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MoreHorizontal, UserPlus, UserMinus, Users, Briefcase, Plus, Building2, Mail, Phone, CheckCircle2, Edit2, Trash2, AlertTriangle, DollarSign, Calendar, XCircle, Ban, CreditCard, Power, Server, Clock, TrendingUp } from 'lucide-react';

interface ClientSectionProps {
  clients: any[];
  projects: any[];
  contracts: any[];
  financial: any[];
  initialTab?: 'clients' | 'contracts' | 'hosting';
}

export function ClientSection({ clients, projects, contracts, financial, initialTab }: ClientSectionProps) {
  const { selectedCompanyId, companies } = useCompany();
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'contracts' | 'hosting' | 'hosting_base'>(initialTab === 'hosting' ? 'hosting_base' : (initialTab || 'clients'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isContractDeleteModalOpen, setIsContractDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedContractToDelete, setSelectedContractToDelete] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    status: 'active',
    category: (initialTab === 'hosting' ? 'hosting' : 'agency') as 'agency' | 'hosting',
    type: 'recurrent',
    companyId: '',
    recurringService: '',
    recurringValue: 0
  });

  const [contractFormData, setContractFormData] = useState({
    id: '',
    clientId: '',
    service: '',
    category: 'recurrence' as 'recurrence' | 'hosting',
    monthlyValue: 0,
    status: 'active' as const,
    companyId: ''
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = selectedCompanyId || formData.companyId;
    if (!companyId) {
      return;
    }
    setLoading(true);
    try {
      const clientRef = await addClient({
        name: formData.name,
        company: formData.company,
        status: formData.status,
        category: formData.category,
        type: formData.type
      }, companyId);

      if (formData.recurringValue > 0 && clientRef) {
        await addContract({
          clientId: clientRef.id,
          service: formData.recurringService || 'Consultoria de Recorrência',
          monthlyValue: Number(formData.recurringValue),
          status: 'active',
        }, companyId);
      }

      setIsModalOpen(false);
      setFormData({ 
        name: '', 
        company: '', 
        status: 'active', 
        category: (initialTab === 'hosting' ? 'hosting' : 'agency') as 'agency' | 'hosting',
        type: 'recurrent', 
        companyId: '',
        recurringService: '',
        recurringValue: 0
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setLoading(true);
    try {
      await updateClient(selectedClient.id, formData);
      setIsEditModalOpen(false);
      setSelectedClient(null);
      setFormData({ 
        name: '', 
        company: '', 
        status: 'active', 
        category: (initialTab === 'hosting' ? 'hosting' : 'agency'),
        type: 'recurrent', 
        companyId: '' 
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      await deleteClient(selectedClient.id);
      setIsDeleteModalOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePayment = async (contract: any) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const client = clients.find(c => c.id === contract.clientId);
    const isPaid = contract.payments?.[currentMonth];
    
    setLoading(true);
    try {
      if (isPaid) {
        // Desmarcar pagamento
        const entryToDelete = financial.find(f => 
          f.clientId === contract.clientId && 
          f.monthRef === currentMonth && 
          f.type === 'income'
        );

        if (entryToDelete) {
          await deleteFinancialEntry(entryToDelete.id);
        }

        const updatedPayments = { ...(contract.payments || {}) };
        delete updatedPayments[currentMonth];
        
        await updateContract(contract.id, {
          payments: updatedPayments
        });
      } else {
        // Marcar como pago
        await addFinancialEntry({
          type: 'income',
          categories: [(contract.category === 'hosting' ? 'Hospedagem' : 'Contrato Recorrente')],
          category: contract.service || (contract.category === 'hosting' ? 'Hospedagem' : 'Contrato Recorrente'),
          value: Number(contract.monthlyValue),
          date: new Date().toISOString(),
          description: `Recebimento ${contract.category === 'hosting' ? 'Hospedagem' : 'Mensal'}: ${contract.service} - ${client?.company || 'Cliente'}`,
          companyId: contract.companyId,
          clientId: contract.clientId,
          monthRef: currentMonth,
          source: contract.category === 'hosting' ? 'hosting' : 'recurrent'
        }, contract.companyId);

        const updatedPayments = { ...(contract.payments || {}), [currentMonth]: true };
        await updateContract(contract.id, {
          payments: updatedPayments,
          lastPaymentDate: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClientStatus = async (client: any) => {
    setLoading(true);
    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    try {
      await updateClient(client.id, { status: newStatus });
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status do cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleContractStatus = async (contract: any) => {
    setLoading(true);
    const newStatus = contract.status === 'active' ? 'cancelled' : 'active';
    try {
      await updateContract(contract.id, { status: newStatus });
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status do contrato.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = (e: React.MouseEvent, contract: any) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedContractToDelete(contract);
    setIsContractDeleteModalOpen(true);
  };

  const handleConfirmDeleteContract = async () => {
    if (!selectedContractToDelete?.id) return;
    
    setLoading(true);
    try {
      await deleteContract(selectedContractToDelete.id);
      setIsContractDeleteModalOpen(false);
      setSelectedContractToDelete(null);
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Ocorreu um erro ao excluir o contrato. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCompanyId = selectedCompanyId || contractFormData.companyId;
    if (!contractFormData.clientId || !targetCompanyId) return;
    
    setLoading(true);
    try {
      if (contractFormData.id) {
        // Edit existing contract
        await updateContract(contractFormData.id, {
          service: contractFormData.service,
          monthlyValue: Number(contractFormData.monthlyValue),
          status: contractFormData.status,
          category: contractFormData.category
        });
      } else {
        // Create new contract
        await addContract({
          clientId: contractFormData.clientId,
          service: contractFormData.service,
          monthlyValue: Number(contractFormData.monthlyValue),
          status: contractFormData.status,
          category: contractFormData.category
        }, targetCompanyId);
      }
      setIsContractModalOpen(false);
      setContractFormData({ id: '', clientId: '', service: '', category: 'recurrence', monthlyValue: 0, status: 'active', companyId: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openContractModal = (client?: any) => {
    const isHosting = activeSubTab === 'hosting' || activeSubTab === 'hosting_base' || initialTab === 'hosting';
    setContractFormData({
      id: '',
      clientId: client?.id || '',
      service: isHosting ? 'Hospedagem' : '',
      category: isHosting ? 'hosting' : 'recurrence',
      monthlyValue: 0,
      status: 'active',
      companyId: client?.companyId || selectedCompanyId || ''
    });
    setIsContractModalOpen(true);
  };

  const openEditContractModal = (contract: any) => {
    setContractFormData({
      id: contract.id,
      clientId: contract.clientId,
      service: contract.service,
      category: contract.category || 'recurrence',
      monthlyValue: contract.monthlyValue,
      status: contract.status,
      companyId: contract.companyId
    });
    setIsContractModalOpen(true);
  };

  const openEditModal = (client: any) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      company: client.company,
      status: client.status,
      category: client.category || 'agency',
      type: client.type || 'recurrent',
      companyId: client.companyId
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (client: any) => {
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  const openHistoryModal = (client: any) => {
    setSelectedClient(client);
    setIsHistoryModalOpen(true);
  };

  const getStatusVariant = (status: string): 'success' | 'attention' | 'danger' | 'default' => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'attention';
      case 'canceled':
      case 'cancelled': return 'danger';
      default: return 'default';
    }
  };

  // Filter data based on view
  const currentCategory = activeSubTab === 'hosting' || activeSubTab === 'hosting_base' || initialTab === 'hosting' ? 'hosting' : 'agency';
  const filteredClients = clients.filter(c => (!c.category && currentCategory === 'agency') || (c.category === currentCategory));

  // Calculate real metrics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const newClientsCount = filteredClients.filter(c => new Date(c.joinedAt) > thirtyDaysAgo).length;
  const churnCount = filteredClients.filter(c => c.status === 'inactive').length;
  const churnRate = filteredClients.length > 0 ? (churnCount / filteredClients.length) * 100 : 0;

  // Hosting Specific Metrics
  const currentMonth = new Date().toISOString().slice(0, 7);
  const hostingContracts = contracts.filter(c => c.category === 'hosting' && c.status === 'active');
  const hostingTotalMonthly = hostingContracts.reduce((acc, curr) => acc + (curr.monthlyValue || 0), 0);
  const hostingTotalPaid = hostingContracts
    .filter(c => c.payments?.[currentMonth])
    .reduce((acc, curr) => acc + (curr.monthlyValue || 0), 0);
  const hostingPendingCount = hostingContracts.filter(c => !c.payments?.[currentMonth]).length;

  // Historical data for the chart
  const chartData = [
    { month: 'Jan', clients: 0 },
    { month: 'Fev', clients: 0 },
    { month: 'Mar', clients: 0 },
    { month: 'Abr', clients: filteredClients.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">
            {initialTab === 'hosting' ? 'Gestão de Hospedagens' : 'Gestão de Clientes & Recorrência'}
          </h3>
          {initialTab === 'hosting' ? (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mt-3 w-fit">
              <button 
                onClick={() => setActiveSubTab('hosting_base')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeSubTab === 'hosting_base' ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Base de Hospedagem
              </button>
              <button 
                onClick={() => setActiveSubTab('hosting')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeSubTab === 'hosting' ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Valores & Pagamentos
              </button>
            </div>
          ) : !initialTab && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mt-3 w-fit">
              <button 
                onClick={() => setActiveSubTab('clients')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeSubTab === 'clients' ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Clientes
              </button>
              <button 
                onClick={() => setActiveSubTab('contracts')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeSubTab === 'contracts' ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Contratos & Recorrência
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={() => {
            setFormData({ 
              ...formData, 
              category: (initialTab === 'hosting' ? 'hosting' : 'agency') 
            });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Novo {initialTab === 'hosting' ? 'Cliente de Hospedagem' : 'Cliente'}
        </button>
      </div>

      {activeSubTab === 'clients' || activeSubTab === 'hosting_base' ? (
        <div className="space-y-6">
          {activeSubTab === 'hosting_base' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Clientes</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredClients.length}</p>
                  <Users className="w-5 h-5 text-violet-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Ativos</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{filteredClients.filter(c => c.status === 'active').length}</p>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Inativos</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">{filteredClients.filter(c => c.status === 'inactive').length}</p>
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Taxa de Churn</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{churnRate.toFixed(1)}%</p>
                  <TrendingUp className="w-5 h-5 text-rose-500" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card 
            title={activeSubTab === 'hosting_base' ? "Base de Hospedagem" : "Base de Clientes"} 
            subtitle="Crescimento histórico" 
            className="lg:col-span-2"
          >
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{newClientsCount}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Últimos 30 dias</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
                <UserMinus className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Churn</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{churnCount}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Taxa de {churnRate.toFixed(0)}%</p>
            </div>
          </div>

          <Card title="Alertas de Risco" subtitle="Clientes com baixa saúde">
            <div className="space-y-4">
              {filteredClients.filter(c => c.status === 'risk' || c.status === 'attention').length > 0 ? (
                filteredClients.filter(c => c.status === 'risk' || c.status === 'attention').map(client => (
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
                  {activeSubTab !== 'hosting_base' ? (
                    <>
                      <th className="px-4 py-3">Recorrência (Mês)</th>
                      <th className="px-4 py-3">Faturamento Total</th>
                    </>
                  ) : (
                    <th className="px-4 py-3">Hospedagem</th>
                  )}
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredClients.map((client) => {
                    const clientProjects = projects.filter(p => p.clientId === client.id);
                    const clientFinancial = financial.filter(f => f.clientId === client.id && f.type === 'income');
                    const totalBilled = clientFinancial.reduce((acc, curr) => acc + (curr.value || 0), 0);
                    
                    return (
                      <tr key={client.id} className={cn(
                        "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                        client.status === 'inactive' && "opacity-50 grayscale"
                      )}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                              {client.name.substring(0, 2)}
                            </div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{client.company}</td>
                        <td className="px-4 py-4 uppercase">
                          <button 
                            onClick={() => handleToggleClientStatus(client)}
                            disabled={loading}
                            className="transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title={client.status === 'active' ? "Clique para Desativar" : "Clique para Ativar"}
                          >
                            <Badge variant={getStatusVariant(client.status)}>
                              {client.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </button>
                        </td>
                        {activeSubTab !== 'hosting_base' ? (
                          <>
                            <td className="px-4 py-4">
                              {(() => {
                                const contract = contracts.find(c => c.clientId === client.id);
                                const currentMonth = new Date().toISOString().slice(0, 7);
                                const isPaid = contract?.payments?.[currentMonth];
                                
                                if (!contract) return (
                                  <button 
                                    onClick={() => openContractModal(client)}
                                    className="text-[10px] font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 flex items-center gap-1 transition-colors"
                                  >
                                    <Plus className="w-2 h-2" />
                                    Ativar Recorrência
                                  </button>
                                );
                                
                                if (contract.status !== 'active') {
                                  return (
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">{formatCurrency(contract.monthlyValue)}/mês</span>
                                      <Badge variant="attention" className="w-fit">Pausado</Badge>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{formatCurrency(contract.monthlyValue)}/mês</span>
                                    <button 
                                      onClick={() => handleTogglePayment(contract)}
                                      disabled={loading}
                                      className="transition-all hover:scale-105 active:scale-95"
                                      title={isPaid ? "Desmarcar recebimento" : "Marcar como recebido"}
                                    >
                                      {isPaid ? (
                                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span className="text-[10px] font-bold">Pago</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-bold">
                                          <div className="w-3 h-3 rounded-full border border-amber-500"></div>
                                          <span className="text-[10px]">Pendente</span>
                                        </div>
                                      )}
                                    </button>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(totalBilled)}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{clientFinancial.length} transações</span>
                              </div>
                            </td>
                          </>
                        ) : (
                          <td className="px-4 py-4">
                            {(() => {
                              const contract = contracts.find(c => c.clientId === client.id && c.category === 'hosting');
                              if (contract) {
                                return (
                                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-bold">Configurado</span>
                                  </div>
                                );
                              }
                              return (
                                <button 
                                  onClick={() => openContractModal(client)}
                                  className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-lg text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  Ativar Hospedagem
                                </button>
                              );
                            })()}
                          </td>
                        )}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const contract = contracts.find(c => c.clientId === client.id);
                              return contract ? (
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => openEditContractModal(contract)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
                                    title="Editar Recorrência"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </button>
                                  {contract.status === 'active' ? (
                                    <button 
                                      onClick={() => handleToggleContractStatus(contract)}
                                      disabled={loading}
                                      className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors text-slate-400 hover:text-amber-600 disabled:opacity-50"
                                      title="Desativar Recorrência"
                                    >
                                      <Power className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => handleToggleContractStatus(contract)}
                                      disabled={loading}
                                      className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-slate-400 hover:text-emerald-600 disabled:opacity-50"
                                      title="Ativar Recorrência"
                                    >
                                      <Power className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => handleDeleteContract(e, contract)}
                                    disabled={loading}
                                    className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-slate-400 hover:text-rose-600 disabled:opacity-50"
                                    title="Excluir Recorrência"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => openContractModal(client)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                                  title="Adicionar Recorrência (Contrato)"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              );
                            })()}
                            <button 
                              onClick={() => handleToggleClientStatus(client)}
                              disabled={loading}
                              className={cn(
                                "p-1.5 rounded-lg transition-colors disabled:opacity-50",
                                client.status === 'active' 
                                  ? "hover:bg-amber-100 dark:hover:bg-amber-900/30 text-slate-400 hover:text-amber-600"
                                  : "hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600"
                              )}
                              title={client.status === 'active' ? "Desativar Cliente" : "Ativar Cliente"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openHistoryModal(client)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
                              title="Ver Histórico Financeiro"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openEditModal(client)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(client)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={activeSubTab === 'hosting_base' ? 5 : 6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                      Nenhum cliente cadastrado nesta categoria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
      ) : (
        <div className="space-y-6">
          {activeSubTab === 'hosting' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Previsto (Mês)</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(hostingTotalMonthly)}</p>
                  <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <Server className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500 font-medium">{hostingContracts.length} hospedagens ativas</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Recebido</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(hostingTotalPaid)}</p>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{Math.round((hostingTotalPaid / (hostingTotalMonthly || 1)) * 100)}%</p>
                </div>
                <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${(hostingTotalPaid / (hostingTotalMonthly || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Pendentes</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">{hostingPendingCount}</p>
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500 font-medium">Aguardando recebimento este mês</p>
              </div>
            </div>
          )}

          <Card 
            title={activeSubTab === 'contracts' ? "Contratos & Recorrência" : "Valores de Hospedagem"} 
            subtitle={activeSubTab === 'contracts' ? "Gestão de pagamentos recorrentes e assinaturas" : "Gestão de valores recorrentes de servidores e domínios"}
          action={
            <button 
              onClick={() => openContractModal()}
              className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
            >
              <Plus className="w-3 h-3" />
              {activeSubTab === 'contracts' ? "Novo Contrato" : "Nova Hospedagem"}
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-3">Cliente / Empresa</th>
                  <th className="px-4 py-3">{activeSubTab === 'contracts' ? "Serviço" : "Plano de Hospedagem"}</th>
                  <th className="px-4 py-3">Valor Mensal</th>
                  <th className="px-4 py-3">Status Pagamento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {contracts
                  .filter(c => {
                    const client = clients.find(cl => cl.id === c.clientId);
                    const isHostingTab = activeSubTab === 'hosting' || activeSubTab === 'hosting_base' || initialTab === 'hosting';
                    const categoryMatch = isHostingTab ? c.category === 'hosting' : (!c.category || c.category === 'recurrence');
                    return categoryMatch;
                  })
                  .sort((a, b) => (a.status === 'cancelled' || a.status === 'canceled' ? 1 : -1)).map((contract) => {
                  const client = clients.find(c => c.id === contract.clientId);
                  const currentMonth = new Date().toISOString().slice(0, 7);
                  const isPaid = contract.payments?.[currentMonth];
                  
                  return (
                    <tr key={contract.id} className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                      (contract.status === 'cancelled' || contract.status === 'canceled') && "opacity-50 grayscale"
                    )}>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{client?.company || 'Cliente não encontrado'}</span>
                          <span className="text-xs text-slate-500">{client?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">{contract.service}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(contract.monthlyValue)}
                      </td>
                      <td className="px-4 py-4">
                        {contract.status === 'active' ? (
                          <button 
                            onClick={() => handleTogglePayment(contract)}
                            disabled={loading}
                            className="transition-all hover:scale-105 active:scale-95 text-left"
                            title={isPaid ? "Desmarcar recebimento" : "Marcar como recebido"}
                          >
                            {isPaid ? (
                              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-bold">Pago ({new Date().toLocaleString('pt-BR', { month: 'long' })})</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-amber-600 hover:text-amber-700 dark:text-amber-500 font-bold">
                                <div className="w-4 h-4 rounded-full border-2 border-amber-500"></div>
                                <span className="text-xs">Marcar Recebimento</span>
                              </div>
                            )}
                          </button>
                        ) : (
                          <Badge variant="risk">Cancelado</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 uppercase">
                        <button 
                          onClick={() => handleToggleContractStatus(contract)}
                          disabled={loading}
                          className="transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                          title={contract.status === 'active' ? "Clique para Desativar" : "Clique para Ativar"}
                        >
                          <Badge variant={getStatusVariant(contract.status)}>
                            {contract.status === 'active' ? 'Ativo' : (contract.status === 'cancelled' || contract.status === 'canceled' ? 'Cancelado' : contract.status)}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditContractModal(contract)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
                            title="Editar Contrato"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {contract.status === 'active' ? (
                            <button 
                              onClick={() => handleToggleContractStatus(contract)}
                              disabled={loading}
                              className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors text-slate-400 hover:text-amber-600 disabled:opacity-50"
                              title="Desativar Recorrência"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleToggleContractStatus(contract)}
                              disabled={loading}
                              className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-slate-400 hover:text-emerald-600 disabled:opacity-50"
                              title="Ativar Recorrência"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => handleDeleteContract(e, contract)}
                            disabled={loading}
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors text-slate-400 hover:text-rose-600 disabled:opacity-50"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {contracts.filter(c => {
                  const isHostingTab = activeSubTab === 'hosting' || activeSubTab === 'hosting_base' || initialTab === 'hosting';
                  return isHostingTab ? c.category === 'hosting' : (!c.category || c.category === 'recurrence');
                }).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                      Nenhum registro encontrado nesta categoria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Cadastrar Novo Cliente"
      >
        <form onSubmit={handleAddClient} className="space-y-4">
          {!selectedCompanyId && (
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
              <p className="text-[10px] text-slate-400 mt-1">O cliente deve estar vinculado a uma de suas empresas.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tipo de Cliente</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
            >
              <option value="agency">Agência</option>
              <option value="hosting">Hospedagem</option>
            </select>
          </div>

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

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Configuração de Recorrência (Opcional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Serviço/Plano</label>
                <input 
                  type="text" 
                  value={formData.recurringService}
                  onChange={(e) => setFormData({ ...formData, recurringService: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  placeholder="Ex: Gestor VIP"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Valor Mensal (R$)</label>
                <input 
                  type="number" 
                  value={formData.recurringValue}
                  onChange={(e) => setFormData({ ...formData, recurringValue: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  placeholder="0.00"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">Se preenchido, um contrato de recorrência será criado automaticamente para este cliente.</p>
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

      {/* Edit Client Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Editar Cliente"
      >
        <form onSubmit={handleEditClient} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome do Contato</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
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
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="active">Ativo</option>
                <option value="attention">Atenção</option>
                <option value="risk">Risco</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Histórico Financeiro: ${selectedClient?.company}`}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Pago</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(financial.filter(f => f.clientId === selectedClient?.id && f.type === 'income').reduce((acc, curr) => acc + curr.value, 0))}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transações</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {financial.filter(f => f.clientId === selectedClient?.id).length}
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {financial.filter(f => f.clientId === selectedClient?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${entry.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <p className={`text-sm font-bold ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.value)}
                </p>
              </div>
            ))}
            {financial.filter(f => f.clientId === selectedClient?.id).length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-sm text-slate-400 dark:text-slate-600 italic">Nenhuma transação vinculada a este cliente.</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsHistoryModalOpen(false)}
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </Modal>

      {/* Delete Client Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="Excluir Cliente"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-800 dark:text-rose-300">Atenção!</p>
              <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                Você está prestes a excluir o cliente <strong>{selectedClient?.name}</strong>. 
                Esta ação é irreversível e removerá todos os dados associados.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleDeleteClient}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-50"
            >
              {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Contract Modal */}
      <Modal 
        isOpen={isContractDeleteModalOpen} 
        onClose={() => setIsContractDeleteModalOpen(false)} 
        title="Excluir Recorrência"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-800 dark:text-rose-300">Atenção!</p>
              <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                Você deseja EXCLUIR permanentemente a recorrência <strong>{selectedContractToDelete?.service}</strong> do cliente <strong>{clients.find(c => c.id === selectedContractToDelete?.clientId)?.company || selectedContractToDelete?.name}</strong>?
              </p>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-2 font-medium">
                * Esta ação removerá apenas o contrato recorrente. O cliente e seu histórico financeiro serão mantidos.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsContractDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirmDeleteContract}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-50"
            >
              {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Manual Contract Modal */}
      <Modal 
        isOpen={isContractModalOpen} 
        onClose={() => setIsContractModalOpen(false)} 
        title={contractFormData.id ? "Editar Contrato de Recorrência" : "Novo Contrato de Recorrência"}
      >
        <form onSubmit={handleSaveContract} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Selecionar Cliente</label>
            <select 
              required
              disabled={!!contractFormData.id}
              value={contractFormData.clientId}
              onChange={(e) => {
                const client = clients.find(c => c.id === e.target.value);
                setContractFormData({ ...contractFormData, clientId: e.target.value, companyId: client?.companyId || '' });
              }}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
            >
              <option value="">Selecione o cliente...</option>
              {filteredClients.map(c => (
                <option key={c.id} value={c.id}>{c.company} ({c.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Categoria do Contrato</label>
            <select 
              value={contractFormData.category}
              onChange={(e) => setContractFormData({ ...contractFormData, category: e.target.value as any })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
            >
              <option value="recurrence">Recorrência Geral</option>
              <option value="hosting">Hospedagem</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Serviço / Plano</label>
            <input 
              type="text" 
              value={contractFormData.service}
              onChange={(e) => setContractFormData({ ...contractFormData, service: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              placeholder="Ex: Gestão de Tráfego VIP, Manutenção"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Valor Mensal (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="number" 
                value={contractFormData.monthlyValue}
                onChange={(e) => setContractFormData({ ...contractFormData, monthlyValue: Number(e.target.value) })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Salvando...' : (contractFormData.id ? 'Salvar Alterações' : 'Ativar Recorrência')}
          </button>
        </form>
      </Modal>
    </div>
  );
}
