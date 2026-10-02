import React, { useState, useMemo } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  Briefcase, 
  Calendar, 
  ExternalLink,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { Onboarding, OnboardingStep, Client, Service, ClientService } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { cn } from '../lib/utils';
import { addOnboarding, updateOnboarding, deleteOnboarding } from '../services/db';

interface OnboardingSectionProps {
  onboardings: Onboarding[];
  clients: Client[];
  services: Service[];
  clientServices: ClientService[];
  companyId: string;
}

export function OnboardingSection({
  onboardings,
  clients,
  services,
  clientServices,
  companyId
}: OnboardingSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOnboarding, setSelectedOnboarding] = useState<Onboarding | null>(null);

  // New Onboarding Modal
  const [isNewOnboardingModalOpen, setIsNewOnboardingModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [startingOnboardingLoading, setStartingOnboardingLoading] = useState(false);

  // New Step modal
  const [isNewStepModalOpen, setIsNewStepModalOpen] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');

  // Metrics
  const metrics = useMemo(() => {
    const total = onboardings.length;
    const pending = onboardings.filter(o => o.status === 'pending').length;
    const inProgress = onboardings.filter(o => o.status === 'in_progress').length;
    const completed = onboardings.filter(o => o.status === 'completed').length;
    const paused = onboardings.filter(o => o.status === 'paused').length;

    return { total, pending, inProgress, completed, paused };
  }, [onboardings]);

  // Clients that do NOT have an onboarding yet
  const availableClientsForOnboarding = useMemo(() => {
    const clientsWithOnboarding = new Set(onboardings.map(o => o.clientId));
    return clients.filter(c => !clientsWithOnboarding.has(c.id));
  }, [clients, onboardings]);

  // Filtered list
  const filteredOnboardings = useMemo(() => {
    return onboardings.filter(onb => {
      const client = clients.find(c => c.id === onb.clientId);
      const matchesSearch = !searchTerm || 
        client?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || onb.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [onboardings, clients, searchTerm, statusFilter]);

  const handleStartOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !companyId) return;

    setStartingOnboardingLoading(true);
    const initialSteps: OnboardingStep[] = [
      { id: '1', title: 'Reunião de Kickoff e Alinhamento', description: 'Reunião inicial com o cliente para alinhar expectativas e metas.', order: 1, completed: false },
      { id: '2', title: 'Coleta de Acessos e Briefing', description: 'Receber credenciais do Gerenciador de Anúncios, sites, domínios e redes sociais.', order: 2, completed: false },
      { id: '3', title: 'Criação do Canal Oficial de Comunicação', description: 'Configurar grupo oficial no WhatsApp com equipe e cliente.', order: 3, completed: false },
      { id: '4', title: 'Planejamento e Setup Técnico', description: 'Configuração de pixels, tags, domínio e contas de anúncio.', order: 4, completed: false },
      { id: '5', title: 'Apresentação da Estrutura e Início Oficial', description: 'Validação do cronograma de entregas com o cliente.', order: 5, completed: false }
    ];

    try {
      const docRef = await addOnboarding({
        clientId: selectedClientId,
        companyId,
        status: 'in_progress',
        currentStep: 0,
        steps: initialSteps,
        startedAt: new Date().toISOString()
      }, companyId);

      setIsNewOnboardingModalOpen(false);
      setSelectedClientId('');
      if (docRef) {
        setSelectedOnboarding({
          id: docRef.id,
          clientId: selectedClientId,
          companyId,
          userId: '',
          status: 'in_progress',
          currentStep: 0,
          steps: initialSteps,
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error starting onboarding:', err);
    } finally {
      setStartingOnboardingLoading(false);
    }
  };

  const handleToggleStep = async (onboarding: Onboarding, stepId: string) => {
    const updatedSteps = onboarding.steps.map(step => {
      if (step.id === stepId) {
        const nextCompleted = !step.completed;
        return {
          ...step,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined
        };
      }
      return step;
    });

    const completedCount = updatedSteps.filter(s => s.completed).length;
    let newStatus: 'pending' | 'in_progress' | 'completed' = 'in_progress';
    let completedAt: string | undefined = onboarding.completedAt;

    if (completedCount === updatedSteps.length && updatedSteps.length > 0) {
      newStatus = 'completed';
      completedAt = new Date().toISOString();
    } else if (completedCount === 0) {
      newStatus = 'pending';
      completedAt = undefined;
    }

    try {
      await updateOnboarding(onboarding.id, {
        steps: updatedSteps,
        status: newStatus,
        completedAt
      });

      if (selectedOnboarding && selectedOnboarding.id === onboarding.id) {
        setSelectedOnboarding({
          ...selectedOnboarding,
          steps: updatedSteps,
          status: newStatus,
          completedAt
        });
      }
    } catch (err) {
      console.error('Error toggling step:', err);
    }
  };

  const handleAddStepToCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOnboarding || !newStepTitle) return;

    const newStep: OnboardingStep = {
      id: Date.now().toString(),
      title: newStepTitle,
      description: newStepDescription,
      order: (selectedOnboarding.steps?.length || 0) + 1,
      completed: false
    };

    const updatedSteps = [...(selectedOnboarding.steps || []), newStep];
    try {
      await updateOnboarding(selectedOnboarding.id, { steps: updatedSteps });
      setSelectedOnboarding({
        ...selectedOnboarding,
        steps: updatedSteps
      });
      setIsNewStepModalOpen(false);
      setNewStepTitle('');
      setNewStepDescription('');
    } catch (err) {
      console.error('Error adding step:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Concluído</Badge>;
      case 'in_progress': return <Badge variant="attention">Em Andamento</Badge>;
      case 'paused': return <Badge variant="default">Pausado</Badge>;
      case 'cancelled': return <Badge variant="danger">Cancelado</Badge>;
      default: return <Badge variant="default">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Onboarding de Clientes</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Esteira de acolhimento e setup operacional de novos clientes</p>
        </div>
        <button
          onClick={() => setIsNewOnboardingModalOpen(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Novo Onboarding
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Em Andamento</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{metrics.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendentes</p>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{metrics.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Concluídos</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{metrics.completed}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pausados</p>
          <p className="text-2xl font-black text-slate-500 mt-1">{metrics.paused}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-80 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'in_progress', 'pending', 'completed', 'paused'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors",
                statusFilter === status
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              )}
            >
              {status === 'all' ? 'Todos' : status === 'in_progress' ? 'Em Andamento' : status === 'pending' ? 'Pendentes' : status === 'completed' ? 'Concluídos' : 'Pausados'}
            </button>
          ))}
        </div>
      </div>

      {/* Onboarding List Table */}
      <Card title="Acompanhamento de Onboarding" subtitle="CLIENTE | SERVIÇOS | PROGRESSO | STATUS | RESPONSÁVEL | INÍCIO">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Serviços em Operação</th>
                <th className="py-3 px-4">Progresso</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Início</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOnboardings.map(onb => {
                const client = clients.find(c => c.id === onb.clientId);
                const clientSvcList = clientServices
                  .filter(cs => cs.clientId === onb.clientId)
                  .map(cs => services.find(s => s.id === cs.serviceId)?.name)
                  .filter(Boolean);

                const totalSteps = onb.steps?.length || 0;
                const completedSteps = onb.steps?.filter(s => s.completed).length || 0;
                const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                return (
                  <tr
                    key={onb.id}
                    onClick={() => setSelectedOnboarding(onb)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{client?.company || 'Cliente não encontrado'}</p>
                        <p className="text-xs text-slate-500">{client?.name || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {clientSvcList.length > 0 ? (
                          clientSvcList.map(sName => (
                            <span key={sName} className="text-[10px] font-semibold px-2 py-0.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-md">
                              {sName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sem serviços ativos</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-36">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>{completedSteps}/{totalSteps} etapas</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              progressPct === 100 ? "bg-emerald-500" : "bg-violet-600"
                            )}
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(onb.status)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {onb.startedAt ? new Date(onb.startedAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedOnboarding(onb);
                        }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/30 text-slate-600 dark:text-slate-300 hover:text-violet-600 text-xs font-bold rounded-lg transition-colors"
                      >
                        Abrir Checklist
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredOnboardings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs italic">
                    Nenhum onboarding encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: New Onboarding */}
      <Modal
        isOpen={isNewOnboardingModalOpen}
        onClose={() => setIsNewOnboardingModalOpen(false)}
        title="Iniciar Novo Onboarding"
      >
        <form onSubmit={handleStartOnboarding} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Selecione o Cliente Existente
            </label>
            <select
              required
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Selecione um cliente...</option>
              {availableClientsForOnboarding.map(c => (
                <option key={c.id} value={c.id}>{c.company} ({c.name})</option>
              ))}
            </select>
            {availableClientsForOnboarding.length === 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                Todos os clientes cadastrados já possuem onboarding ativo.
              </p>
            )}
          </div>

          <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/30 rounded-xl text-xs text-violet-700 dark:text-violet-300">
            O onboarding será iniciado com 5 etapas fundamentais de boas-vindas e alinhamento de expectativas.
          </div>

          <button
            type="submit"
            disabled={startingOnboardingLoading || !selectedClientId}
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {startingOnboardingLoading ? 'Iniciando...' : 'Iniciar Onboarding'}
          </button>
        </form>
      </Modal>

      {/* Modal: Manage Specific Onboarding Checklist */}
      <Modal
        isOpen={!!selectedOnboarding}
        onClose={() => setSelectedOnboarding(null)}
        title={`Checklist de Onboarding — ${clients.find(c => c.id === selectedOnboarding?.clientId)?.company || 'Cliente'}`}
      >
        {selectedOnboarding && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500">
                  Iniciado em: {selectedOnboarding.startedAt ? new Date(selectedOnboarding.startedAt).toLocaleDateString('pt-BR') : '-'}
                </p>
                <div className="mt-1">
                  {getStatusBadge(selectedOnboarding.status)}
                </div>
              </div>

              <button
                onClick={() => setIsNewStepModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-lg text-xs font-bold hover:bg-violet-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Etapa
              </button>
            </div>

            {/* Checklist */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {selectedOnboarding.steps?.map((step, idx) => (
                <div
                  key={step.id || idx}
                  onClick={() => handleToggleStep(selectedOnboarding, step.id)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                    step.completed
                      ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-300 shadow-sm"
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center mt-0.5 transition-colors",
                      step.completed ? "bg-emerald-600 text-white" : "border-2 border-slate-300 dark:border-slate-600"
                    )}
                  >
                    {step.completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div className="flex-1">
                    <h5 className={cn(
                      "text-sm font-bold",
                      step.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"
                    )}>
                      {idx + 1}. {step.title}
                    </h5>
                    {step.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedOnboarding(null)}
              className="w-full bg-slate-900 dark:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Fechar Visualização
            </button>
          </div>
        )}
      </Modal>

      {/* Modal: Add Step */}
      <Modal
        isOpen={isNewStepModalOpen}
        onClose={() => setIsNewStepModalOpen(false)}
        title="Adicionar Etapa ao Checklist"
      >
        <form onSubmit={handleAddStepToCurrent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título da Etapa</label>
            <input
              type="text"
              required
              value={newStepTitle}
              onChange={e => setNewStepTitle(e.target.value)}
              placeholder="Ex: Assinatura de Contrato e Envio de NF"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
            <textarea
              value={newStepDescription}
              onChange={e => setNewStepDescription(e.target.value)}
              placeholder="Detalhes ou checklist de ações necessárias..."
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors"
          >
            Confirmar Adição de Etapa
          </button>
        </form>
      </Modal>
    </div>
  );
}
