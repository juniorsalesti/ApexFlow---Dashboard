import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  PlayCircle, 
  PauseCircle, 
  XCircle, 
  Server, 
  Layers, 
  FileText, 
  Tag,
  CheckSquare,
  Square,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Save,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Client, Project, Contract, Service, ClientService, Onboarding, OnboardingStep, Process, TaskGenerationResult, BatchTaskGenerationResult, TeamMember } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { usePrivacy } from '../contexts/PrivacyContext';
import { 
  updateClient, 
  addClientService, 
  updateClientService, 
  deleteClientService, 
  addOnboarding, 
  updateOnboarding,
  addTask,
  updateTask,
  seedDefaultServices,
  generateTasksFromProcess,
  generateTasksForMultipleProcesses
} from '../services/db';

interface Client360ViewProps {
  client: Client;
  onBack: () => void;
  projects: Project[];
  contracts: Contract[];
  financial: any[];
  tasks: any[];
  services: Service[];
  clientServices: ClientService[];
  onboardings: Onboarding[];
  processes?: Process[];
  teamMembers?: TeamMember[];
  companyId: string;
}

export function Client360View({
  client,
  onBack,
  projects,
  contracts,
  financial,
  tasks,
  services,
  clientServices,
  onboardings,
  processes = [],
  teamMembers = [],
  companyId
}: Client360ViewProps) {
  const { hideValues } = usePrivacy();
  const [activeTab, setActiveTab] = useState<
    'resumo' | 'dados' | 'financeiro' | 'servicos' | 'projetos' | 'onboarding' | 'tarefas' | 'historico'
  >('resumo');

  // Client Data Edit Form
  const [editFormData, setEditFormData] = useState({
    name: client.name || '',
    company: client.company || '',
    status: client.status || 'active',
    category: (client as any).category || 'agency',
    type: (client as any).type || 'recurrent'
  });
  const [savingClient, setSavingClient] = useState(false);
  const [clientUpdateSuccess, setClientUpdateSuccess] = useState(false);

  // Client Services state
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceStartDate, setServiceStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingServiceLoading, setAddingServiceLoading] = useState(false);
  const [seedingServicesLoading, setSeedingServicesLoading] = useState(false);

  // New task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('média');
  const [taskResponsible, setTaskResponsible] = useState('');
  const [taskResponsibleRole, setTaskResponsibleRole] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Map of team members
  const teamMemberMap = useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);

  // Step modal for Onboarding
  const [isNewStepModalOpen, setIsNewStepModalOpen] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');

  // Filtered relations
  const clientContracts = useMemo(() => contracts.filter(c => c.clientId === client.id), [contracts, client.id]);
  const clientProjects = useMemo(() => projects.filter(p => p.clientId === client.id), [projects, client.id]);
  const clientFinancial = useMemo(() => financial.filter(f => f.clientId === client.id), [financial, client.id]);
  const clientTasks = useMemo(() => tasks.filter(t => t.clientId === client.id), [tasks, client.id]);
  const activeClientServices = useMemo(() => clientServices.filter(cs => cs.clientId === client.id), [clientServices, client.id]);
  const clientOnboarding = useMemo(() => onboardings.find(o => o.clientId === client.id), [onboardings, client.id]);

  // Task Generation modal state
  const [isGenerateTasksModalOpen, setIsGenerateTasksModalOpen] = useState(false);
  const [selectedServiceForGeneration, setSelectedServiceForGeneration] = useState<Service | null>(null);
  const [selectedClientServiceForGeneration, setSelectedClientServiceForGeneration] = useState<ClientService | null>(null);
  const [selectedProcessIdForGeneration, setSelectedProcessIdForGeneration] = useState<string>('');
  const [selectedBatchProcessIds, setSelectedBatchProcessIds] = useState<string[]>([]);
  const [generationMode, setGenerationMode] = useState<'batch_services' | 'single_process'>('batch_services');
  const [generatingTasksLoading, setGeneratingTasksLoading] = useState(false);
  const [taskGenerationResult, setTaskGenerationResult] = useState<TaskGenerationResult | BatchTaskGenerationResult | null>(null);

  // Filter for client tasks in tab 7
  const [taskFilterSource, setTaskFilterSource] = useState<'all' | 'process' | 'manual' | 'project'>('all');

  // Match active services to processes
  const matchedProcessesForActiveServices = useMemo(() => {
    const list: {
      clientService: ClientService;
      service?: Service;
      process: Process;
      existingTasksCount: number;
    }[] = [];

    activeClientServices.forEach(cs => {
      if (cs.status !== 'active') return;
      const svc = services.find(s => s.id === cs.serviceId);
      // Find matching process
      const match = processes.find(p => (p.active ?? true) && (
        (cs.serviceId && p.serviceId === cs.serviceId) ||
        (svc?.name && p.serviceName?.toLowerCase() === svc.name.toLowerCase()) ||
        (svc?.category && p.category?.toLowerCase() === svc.category.toLowerCase()) ||
        (svc?.name && p.title.toLowerCase().includes(svc.name.toLowerCase()))
      ));

      if (match) {
        if (!list.some(item => item.process.id === match.id)) {
          const existingCount = clientTasks.filter(t => t.processId === match.id).length;
          list.push({
            clientService: cs,
            service: svc,
            process: match,
            existingTasksCount: existingCount
          });
        }
      }
    });

    return list;
  }, [activeClientServices, services, processes, clientTasks]);

  const handleOpenGenerateTasksModal = (clientService?: ClientService, service?: Service) => {
    setSelectedClientServiceForGeneration(clientService || null);
    setSelectedServiceForGeneration(service || null);
    setTaskGenerationResult(null);

    if (clientService || service) {
      setGenerationMode('single_process');
      const targetServiceId = clientService?.serviceId || service?.id;
      const matchingProcess = processes.find(p => (p.active ?? true) && (
        (targetServiceId && p.serviceId === targetServiceId) ||
        (service?.name && p.serviceName?.toLowerCase() === service.name.toLowerCase()) ||
        (service?.category && p.category?.toLowerCase() === service.category.toLowerCase())
      ));
      
      if (matchingProcess) {
        setSelectedProcessIdForGeneration(matchingProcess.id);
      } else {
        const firstActive = processes.find(p => (p.active ?? true));
        setSelectedProcessIdForGeneration(firstActive?.id || '');
      }
    } else {
      // General click (e.g. from header or tab):
      if (matchedProcessesForActiveServices.length > 0) {
        setGenerationMode('batch_services');
        setSelectedBatchProcessIds(matchedProcessesForActiveServices.map(m => m.process.id));
      } else {
        setGenerationMode('single_process');
        const firstActive = processes.find(p => (p.active ?? true));
        setSelectedProcessIdForGeneration(firstActive?.id || '');
      }
    }

    setIsGenerateTasksModalOpen(true);
  };

  const handleExecuteGenerateTasks = async () => {
    setGeneratingTasksLoading(true);
    setTaskGenerationResult(null);

    try {
      if (generationMode === 'batch_services') {
        if (selectedBatchProcessIds.length === 0) {
          alert('Por favor, selecione pelo menos um processo para gerar.');
          setGeneratingTasksLoading(false);
          return;
        }

        const itemsToGenerate = selectedBatchProcessIds.map(procId => {
          const match = matchedProcessesForActiveServices.find(m => m.process.id === procId);
          const proc = processes.find(p => p.id === procId);
          return {
            processId: procId,
            processTitle: proc?.title || '',
            serviceId: match?.clientService.serviceId || proc?.serviceId || '',
            serviceName: match?.service?.name || proc?.serviceName || ''
          };
        });

        const batchResult = await generateTasksForMultipleProcesses({
          clientId: client.id,
          companyId,
          processesToGenerate: itemsToGenerate
        });

        setTaskGenerationResult(batchResult);
      } else {
        if (!selectedProcessIdForGeneration) {
          alert('Por favor, selecione um processo para gerar as tarefas.');
          setGeneratingTasksLoading(false);
          return;
        }

        const targetServiceId = selectedClientServiceForGeneration?.serviceId || selectedServiceForGeneration?.id || '';
        const targetServiceName = selectedServiceForGeneration?.name || '';

        const result = await generateTasksFromProcess({
          clientId: client.id,
          serviceId: targetServiceId,
          serviceName: targetServiceName,
          processId: selectedProcessIdForGeneration,
          companyId
        });

        setTaskGenerationResult(result);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao gerar tarefas.');
    } finally {
      setGeneratingTasksLoading(false);
    }
  };

  // Financial aggregates
  const totalBilled = useMemo(() => {
    return clientFinancial
      .filter(f => f.type === 'income')
      .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [clientFinancial]);

  const activeContractMRR = useMemo(() => {
    return clientContracts
      .filter(c => c.status === 'active')
      .reduce((acc, curr) => acc + (Number(curr.monthlyValue) || 0), 0);
  }, [clientContracts]);

  // Handlers
  const handleSaveClientData = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClient(true);
    setClientUpdateSuccess(false);
    try {
      await updateClient(client.id, editFormData);
      setClientUpdateSuccess(true);
      setTimeout(() => setClientUpdateSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating client data:', err);
    } finally {
      setSavingClient(false);
    }
  };

  const handleAddClientService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !companyId) return;

    setAddingServiceLoading(true);
    try {
      await addClientService({
        clientId: client.id,
        serviceId: selectedServiceId,
        companyId,
        status: 'active',
        startDate: serviceStartDate || new Date().toISOString(),
        notes: serviceNotes
      }, companyId);

      setIsAddServiceModalOpen(false);
      setSelectedServiceId('');
      setServiceNotes('');
    } catch (err) {
      console.error('Error adding client service:', err);
    } finally {
      setAddingServiceLoading(false);
    }
  };

  const handleUpdateServiceStatus = async (clientServiceId: string, status: 'active' | 'paused' | 'cancelled' | 'completed') => {
    try {
      await updateClientService(clientServiceId, { status });
    } catch (err) {
      console.error('Error updating service status:', err);
    }
  };

  const handleDeleteClientService = async (clientServiceId: string) => {
    if (!confirm('Deseja desvincular este serviço operacional do cliente?')) return;
    try {
      await deleteClientService(clientServiceId);
    } catch (err) {
      console.error('Error deleting client service:', err);
    }
  };

  const handleSeedServices = async () => {
    if (!companyId) return;
    setSeedingServicesLoading(true);
    try {
      await seedDefaultServices(companyId);
    } catch (err) {
      console.error('Error seeding services:', err);
    } finally {
      setSeedingServicesLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    if (!companyId) return;
    const initialSteps: OnboardingStep[] = [
      { id: '1', title: 'Reunião de Kickoff e Alinhamento', description: 'Reunião inicial com o cliente para alinhar expectativas e metas.', order: 1, completed: false },
      { id: '2', title: 'Coleta de Acessos e Briefing', description: 'Receber credenciais do Gerenciador de Anúncios, sites, domínios e redes sociais.', order: 2, completed: false },
      { id: '3', title: 'Criação do Canal Oficial de Comunicação', description: 'Configurar grupo oficial no WhatsApp com equipe e cliente.', order: 3, completed: false },
      { id: '4', title: 'Planejamento e Setup Técnico', description: 'Configuração de pixels, tags, domínio e contas de anúncio.', order: 4, completed: false },
      { id: '5', title: 'Apresentação da Estrutura e Início Oficial', description: 'Validação do cronograma de entregas com o cliente.', order: 5, completed: false }
    ];

    try {
      await addOnboarding({
        clientId: client.id,
        companyId,
        status: 'in_progress',
        currentStep: 0,
        steps: initialSteps,
        startedAt: new Date().toISOString()
      }, companyId);
    } catch (err) {
      console.error('Error starting onboarding:', err);
    }
  };

  const handleToggleOnboardingStep = async (stepId: string) => {
    if (!clientOnboarding) return;

    const updatedSteps = clientOnboarding.steps.map(step => {
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
    let completedAt: string | undefined = clientOnboarding.completedAt;

    if (completedCount === updatedSteps.length && updatedSteps.length > 0) {
      newStatus = 'completed';
      completedAt = new Date().toISOString();
    } else if (completedCount === 0) {
      newStatus = 'pending';
      completedAt = undefined;
    }

    try {
      await updateOnboarding(clientOnboarding.id, {
        steps: updatedSteps,
        status: newStatus,
        completedAt
      });
    } catch (err) {
      console.error('Error toggling onboarding step:', err);
    }
  };

  const handleAddOnboardingStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientOnboarding || !newStepTitle) return;

    const newStep: OnboardingStep = {
      id: Date.now().toString(),
      title: newStepTitle,
      description: newStepDescription,
      order: clientOnboarding.steps.length + 1,
      completed: false
    };

    const updatedSteps = [...clientOnboarding.steps, newStep];
    try {
      await updateOnboarding(clientOnboarding.id, {
        steps: updatedSteps
      });
      setIsNewStepModalOpen(false);
      setNewStepTitle('');
      setNewStepDescription('');
    } catch (err) {
      console.error('Error adding onboarding step:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !companyId) return;

    setSavingTask(true);
    try {
      await addTask({
        title: taskTitle,
        priority: taskPriority,
        responsible: taskResponsible || 'Equipe',
        deadline: taskDeadline,
        status: 'a fazer',
        date: 'Segunda-feira',
        clientId: client.id
      }, companyId);

      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskResponsible('');
      setTaskDeadline('');
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const nextStatus = task.status === 'concluído' ? 'a fazer' : 'concluído';
    try {
      await updateTask(task.id, { status: nextStatus });
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  // Onboarding metrics
  const onboardingProgress = useMemo(() => {
    if (!clientOnboarding || !clientOnboarding.steps || clientOnboarding.steps.length === 0) return 0;
    const completed = clientOnboarding.steps.filter(s => s.completed).length;
    return Math.round((completed / clientOnboarding.steps.length) * 100);
  }, [clientOnboarding]);

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button and Quick Switcher */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Clientes</span>
        </button>

        <div className="flex items-center gap-2">
          <Badge variant={client.status === 'active' ? 'success' : 'attention'} className="text-xs px-2.5 py-1 font-bold">
            {client.status === 'active' ? '🟢 Ativo' : '⚪ Inativo'}
          </Badge>
          <span className="text-xs text-slate-400 font-mono">ID: {client.id.substring(0, 8)}...</span>
        </div>
      </div>

      {/* Hero Header 360° */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-violet-200 dark:shadow-none">
              {client.company?.substring(0, 2).toUpperCase() || client.name?.substring(0, 2).toUpperCase() || 'CL'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{client.company}</h2>
                <Badge variant={client.status === 'active' ? 'success' : 'attention'}>
                  {client.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Contato: <strong>{client.name}</strong></span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Desde {client.joinedAt ? new Date(client.joinedAt).toLocaleDateString('pt-BR') : 'Data não informada'}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs font-semibold px-2.5 py-1 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-lg">
                  Categoria: {(client as any).category === 'hosting' ? 'Hospedagem' : 'Agência'}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                  Tipo: {(client as any).type === 'both' ? 'Recorrente + Projeto' : (client as any).type === 'project' ? 'Apenas Projeto' : 'Recorrente'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recorrência Mensal</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(activeContractMRR, hideValues)}
              </p>
              <p className="text-[10px] text-slate-400">{clientContracts.length} contrato(s)</p>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faturamento Total</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalBilled, hideValues)}
              </p>
              <p className="text-[10px] text-slate-400">{clientFinancial.length} transações</p>
            </div>
          </div>
        </div>

        {/* 8 Tabs Navigation */}
        <div className="flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 mt-6 pt-4 overflow-x-auto scrollbar-hide">
          {[
            { id: 'resumo', label: '1. Resumo' },
            { id: 'dados', label: '2. Dados' },
            { id: 'financeiro', label: '3. Financeiro' },
            { id: 'servicos', label: `4. Serviços (${activeClientServices.length})` },
            { id: 'projetos', label: `5. Projetos (${clientProjects.length})` },
            { id: 'onboarding', label: '6. Onboarding' },
            { id: 'tarefas', label: `7. Tarefas (${clientTasks.length})` },
            { id: 'historico', label: '8. Histórico' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: RESUMO */}
      {activeTab === 'resumo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Serviços Contratados</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{activeClientServices.length}</p>
              <p className="text-xs text-slate-500 mt-1">
                {activeClientServices.filter(s => s.status === 'active').length} em operação ativa
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Projetos em Andamento</p>
              <p className="text-3xl font-black text-violet-600 dark:text-violet-400">
                {clientProjects.filter(p => p.status === 'execution').length}
              </p>
              <p className="text-xs text-slate-500 mt-1">{clientProjects.length} projeto(s) no total</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tarefas Pendentes</p>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-500">
                {clientTasks.filter(t => t.status !== 'concluído').length}
              </p>
              <p className="text-xs text-slate-500 mt-1">{clientTasks.filter(t => t.status === 'concluído').length} concluídas</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status Onboarding</p>
              <div className="flex items-center gap-2 mt-1">
                {clientOnboarding ? (
                  <Badge variant={clientOnboarding.status === 'completed' ? 'success' : 'attention'}>
                    {clientOnboarding.status === 'completed' ? 'Concluído' : `${onboardingProgress}%`}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-400">Não iniciado</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {clientOnboarding ? `${clientOnboarding.steps?.filter(s => s.completed).length || 0} de ${clientOnboarding.steps?.length || 0} etapas` : 'Aguardando início'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Services Overview */}
            <Card title="Serviços em Operação" subtitle="Serviços ativos vinculados a este cliente">
              <div className="space-y-3">
                {activeClientServices.length > 0 ? (
                  activeClientServices.map(cs => {
                    const svc = services.find(s => s.id === cs.serviceId);
                    return (
                      <div key={cs.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className="text-sm">🟢</span>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{svc?.name || 'Serviço Personalizado'}</p>
                            <p className="text-xs text-slate-400">{svc?.category || 'geral'}</p>
                          </div>
                        </div>
                        <Badge variant="success">Em Execução</Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Nenhum serviço operacional vinculado ainda.</p>
                    <button
                      onClick={() => setActiveTab('servicos')}
                      className="mt-3 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      + Configurar Serviços na Aba 4
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Next Deadline & Recent Projects */}
            <Card title="Próximas Entregas & Projetos" subtitle="Cronograma de projetos ativos">
              <div className="space-y-3">
                {clientProjects.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={p.status === 'delayed' ? 'risk' : 'default'} className="text-[10px]">
                          {p.status === 'delayed' ? 'Atrasado' : p.status === 'execution' ? 'Em Execução' : p.status === 'delivered' ? 'Entregue' : 'Negociação'}
                        </Badge>
                        <span className="text-[10px] text-slate-400">Prazo: {p.deadline ? new Date(p.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(p.value, hideValues)}</span>
                  </div>
                ))}
                {clientProjects.length === 0 && (
                  <div className="text-center py-8">
                    <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Nenhum projeto cadastrado para este cliente.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick action in Resumo tab for Phase 3B */}
            {activeClientServices.some(s => s.status === 'active') && (
              <div className="col-span-full p-4.5 bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-indigo-950/30 border border-violet-100 dark:border-violet-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Automação de Tarefas Operacionais</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-violet-200 dark:bg-violet-900/80 text-violet-800 dark:text-violet-200">
                        SOPs Homologados
                      </span>
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Este cliente possui <strong>{activeClientServices.filter(s => s.status === 'active').length} serviço(s) ativo(s)</strong>. Gere ou sincronize a esteira de tarefas automaticamente com idempotência garantida.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenGenerateTasksModal()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Tarefas dos Serviços Ativos</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: DADOS */}
      {activeTab === 'dados' && (
        <Card title="Dados Cadastrais do Cliente" subtitle="Visualização e edição dos dados cadastrados">
          <form onSubmit={handleSaveClientData} className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Empresa / Razão Social</label>
                <input
                  type="text"
                  required
                  value={editFormData.company}
                  onChange={e => setEditFormData({ ...editFormData, company: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Nome do Contato Principal</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Status do Cliente</label>
                <select
                  value={editFormData.status}
                  onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="active">🟢 Ativo</option>
                  <option value="inactive">⚪ Inativo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Categoria</label>
                <select
                  value={editFormData.category}
                  onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="agency">Agência Geral</option>
                  <option value="hosting">Hospedagem</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Tipo de Atendimento</label>
                <select
                  value={editFormData.type}
                  onChange={e => setEditFormData({ ...editFormData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="recurrent">Recorrente (Contrato Mensal / Fee)</option>
                  <option value="project">Apenas Projeto (One-Time)</option>
                  <option value="both">Ambos (Recorrência + Projetos Pontuais)</option>
                </select>
              </div>
            </div>

            {clientUpdateSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Dados do cliente atualizados com sucesso!
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingClient}
                className="flex items-center gap-2 bg-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingClient ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 3: FINANCEIRO */}
      {activeTab === 'financeiro' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Receita Total do Cliente</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalBilled, hideValues)}</p>
              <p className="text-xs text-slate-400 mt-1">Soma de todas as entradas pagas</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">MRR Recorrente Ativo</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(activeContractMRR, hideValues)}</p>
              <p className="text-xs text-slate-400 mt-1">{clientContracts.length} contrato(s) registrado(s)</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total de Transações</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{clientFinancial.length}</p>
              <p className="text-xs text-slate-400 mt-1">Lançamentos no Financeiro</p>
            </div>
          </div>

          {/* Contracts Linked */}
          <Card title="Contratos do Cliente" subtitle="Contratos de fee mensal e hospedagem vinculados">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-3">Serviço</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Valor Mensal</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Início</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {clientContracts.map(c => (
                    <tr key={c.id}>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{c.service}</td>
                      <td className="py-3 px-3 text-xs text-slate-500">{c.category === 'hosting' ? 'Hospedagem' : 'Recorrência'}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{formatCurrency(c.monthlyValue, hideValues)}</td>
                      <td className="py-3 px-3">
                        <Badge variant={c.status === 'active' ? 'success' : 'attention'}>
                          {c.status === 'active' ? 'Ativo' : c.status === 'cancelled' ? 'Cancelado' : 'Pausado'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-400">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                  {clientContracts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                        Nenhum contrato recorrente cadastrado para este cliente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Financial Transactions Linked */}
          <Card title="Histórico de Entradas Financeiras" subtitle="Lançamentos vinculados diretamente ao clientId">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {clientFinancial.map(f => (
                    <tr key={f.id}>
                      <td className="py-3 px-3 text-xs text-slate-500">{new Date(f.date).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{f.description || f.category || 'Recebimento'}</td>
                      <td className="py-3 px-3">
                        <Badge variant={f.type === 'income' ? 'success' : 'risk'}>
                          {f.type === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </td>
                      <td className={cn(
                        "py-3 px-3 font-bold",
                        f.type === 'income' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {f.type === 'income' ? '+' : '-'} {formatCurrency(f.value, hideValues)}
                      </td>
                    </tr>
                  ))}
                  {clientFinancial.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs italic">
                        Nenhuma movimentação financeira vinculada a este cliente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: SERVIÇOS (OPERACIONAIS) */}
      {activeTab === 'servicos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Serviços Contratados / em Operação</h4>
              <p className="text-xs text-slate-500">Camada de organização operacional de entregas (desacoplada de cobranças)</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeClientServices.some(s => s.status === 'active') && (
                <button
                  onClick={() => handleOpenGenerateTasksModal()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Gerar Tarefas dos Serviços Ativos</span>
                </button>
              )}
              {services.length === 0 && (
                <button
                  onClick={handleSeedServices}
                  disabled={seedingServicesLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {seedingServicesLoading ? 'Criando...' : 'Carregar Catálogo Padrão'}
                </button>
              )}
              <button
                onClick={() => setIsAddServiceModalOpen(true)}
                className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Vincular Novo Serviço
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeClientServices.map(cs => {
              const svc = services.find(s => s.id === cs.serviceId);
              return (
                <div
                  key={cs.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white">{svc?.name || 'Serviço'}</h5>
                        <p className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400 mt-0.5">{svc?.category || 'Operação'}</p>
                      </div>
                      <Badge variant={cs.status === 'active' ? 'success' : cs.status === 'paused' ? 'attention' : 'default'}>
                        {cs.status === 'active' ? 'Ativo' : cs.status === 'paused' ? 'Pausado' : cs.status === 'completed' ? 'Concluído' : 'Cancelado'}
                      </Badge>
                    </div>
                    {cs.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        {cs.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Início: {cs.startDate ? new Date(cs.startDate).toLocaleDateString('pt-BR') : 'Não informada'}
                    </p>
                    {cs.status === 'active' && (
                      <button
                        onClick={() => handleOpenGenerateTasksModal(cs, svc)}
                        className="w-full mt-3 py-1.5 px-2.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-violet-200/60 dark:border-violet-800/40 shadow-sm"
                      >
                        <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        <span>Gerar Tarefas do Processo</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-3">
                    <div className="flex items-center gap-1">
                      {cs.status === 'active' ? (
                        <button
                          onClick={() => handleUpdateServiceStatus(cs.id, 'paused')}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1"
                          title="Pausar Serviço"
                        >
                          <PauseCircle className="w-4 h-4 text-amber-500" />
                          <span className="text-[10px] font-bold">Pausar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateServiceStatus(cs.id, 'active')}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1"
                          title="Ativar Serviço"
                        >
                          <PlayCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-bold">Ativar</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateServiceStatus(cs.id, 'completed')}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1"
                        title="Concluir Serviço"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-bold">Concluir</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteClientService(cs.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"
                      title="Desvincular Serviço"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              );
            })}

            {activeClientServices.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h5 className="font-bold text-slate-900 dark:text-white">Nenhum serviço operacional vinculado</h5>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Vincule os serviços em andamento para este cliente a partir do catálogo ApexFlow.
                </p>
                <button
                  onClick={() => setIsAddServiceModalOpen(true)}
                  className="bg-violet-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors"
                >
                  + Vincular Primeiro Serviço
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: PROJETOS */}
      {activeTab === 'projetos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Projetos do Cliente</h4>
              <p className="text-xs text-slate-500">Projetos One-Time vinculados (Sites, Landing Pages, etc.)</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{clientProjects.length} projeto(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientProjects.map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white">{p.name}</h5>
                    <Badge variant="default" className="text-[10px] mt-1">{p.type}</Badge>
                  </div>
                  <Badge variant={p.status === 'delayed' ? 'risk' : p.status === 'delivered' ? 'success' : 'default'}>
                    {p.status === 'delayed' ? 'Atrasado' : p.status === 'delivered' ? 'Entregue' : p.status === 'execution' ? 'Em Execução' : 'Negociação'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(p.value, hideValues)}</span>
                  <span className="text-[10px] text-slate-400">
                    Prazo: {p.deadline ? new Date(p.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}
                  </span>
                </div>
              </div>
            ))}

            {clientProjects.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Layers className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h5 className="font-bold text-slate-900 dark:text-white">Nenhum projeto registrado</h5>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Projetos criados no módulo de Projetos com o nome deste cliente aparecerão automaticamente aqui.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: ONBOARDING */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          {!clientOnboarding ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto p-8">
              <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/20 text-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Este cliente ainda não possui onboarding</h4>
              <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                Inicie a esteira de onboarding com o checklist padrão para orientar a coleta de acessos, alinhamento de expectativas e início das entregas.
              </p>
              <button
                onClick={handleStartOnboarding}
                className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
              >
                + Iniciar Onboarding
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Onboarding Header Banner */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Onboarding do Cliente</h4>
                    <Badge variant={clientOnboarding.status === 'completed' ? 'success' : 'attention'}>
                      {clientOnboarding.status === 'completed' ? 'Concluído' : clientOnboarding.status === 'in_progress' ? 'Em Andamento' : clientOnboarding.status === 'paused' ? 'Pausado' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Iniciado em {clientOnboarding.startedAt ? new Date(clientOnboarding.startedAt).toLocaleDateString('pt-BR') : '-'}
                    {clientOnboarding.completedAt && ` • Finalizado em ${new Date(clientOnboarding.completedAt).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>

                <div className="flex-1 max-w-md">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600 dark:text-slate-400">Progresso do Onboarding</span>
                    <span className="text-violet-600 dark:text-violet-400 font-mono">{onboardingProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-violet-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${onboardingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-right">
                    {clientOnboarding.steps?.filter(s => s.completed).length || 0} de {clientOnboarding.steps?.length || 0} etapas concluídas
                  </p>
                </div>
              </div>

              {/* Checklist Card */}
              <Card
                title="Checklist de Etapas"
                subtitle="Acompanhe e marque as etapas conforme forem executadas"
                action={
                  <button
                    onClick={() => setIsNewStepModalOpen(true)}
                    className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Etapa
                  </button>
                }
              >
                <div className="space-y-3">
                  {clientOnboarding.steps?.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      onClick={() => handleToggleOnboardingStep(step.id)}
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4",
                        step.completed
                          ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-80"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 shadow-sm"
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center mt-0.5 transition-colors",
                          step.completed
                            ? "bg-emerald-600 text-white"
                            : "border-2 border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {step.completed && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className={cn(
                            "text-sm font-bold",
                            step.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"
                          )}>
                            {idx + 1}. {step.title}
                          </h5>
                          {step.completedAt && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Concluído em {new Date(step.completedAt).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!clientOnboarding.steps || clientOnboarding.steps.length === 0) && (
                    <p className="text-center py-6 text-xs text-slate-400">Nenhuma etapa cadastrada no onboarding.</p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Tab 7: TAREFAS */}
      {activeTab === 'tarefas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Tarefas Vinculadas ao Cliente</h4>
              <p className="text-xs text-slate-500">Demandas operacionais filtradas da coleção existente de tarefas</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleOpenGenerateTasksModal()}
                className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-violet-600" />
                <span>Gerar a partir de Processo</span>
              </button>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nova Tarefa Manual
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setTaskFilterSource('all')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  taskFilterSource === 'all'
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Todas ({clientTasks.length})
              </button>
              <button
                onClick={() => setTaskFilterSource('process')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5",
                  taskFilterSource === 'process'
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Layers className="w-3 h-3" />
                <span>Processos / SOPs ({clientTasks.filter(t => t.source === 'process' || t.processId).length})</span>
              </button>
              <button
                onClick={() => setTaskFilterSource('manual')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  taskFilterSource === 'manual'
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Manuais ({clientTasks.filter(t => t.source !== 'process' && !t.processId && t.source !== 'project' && !t.projectId).length})
              </button>
              <button
                onClick={() => setTaskFilterSource('project')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  taskFilterSource === 'project'
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Projetos ({clientTasks.filter(t => t.source === 'project' || t.projectId).length})
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Tarefas operacionais deste cliente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Tasks */}
            <Card title={`Pendentes (${clientTasks.filter(t => t.status !== 'concluído' && (taskFilterSource === 'all' || (taskFilterSource === 'process' ? (t.source === 'process' || t.processId) : taskFilterSource === 'manual' ? (t.source !== 'process' && !t.processId && t.source !== 'project' && !t.projectId) : (t.source === 'project' || t.projectId)))).length})`}>
              <div className="space-y-3">
                {clientTasks
                  .filter(t => t.status !== 'concluído')
                  .filter(t => {
                    if (taskFilterSource === 'process') return t.source === 'process' || t.processId;
                    if (taskFilterSource === 'manual') return t.source !== 'process' && !t.processId && t.source !== 'project' && !t.projectId;
                    if (taskFilterSource === 'project') return t.source === 'project' || t.projectId;
                    return true;
                  })
                  .map(task => (
                  <div key={task.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="mt-0.5 p-1 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 shrink-0"
                        title="Marcar como concluída"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h6 className="text-sm font-bold text-slate-900 dark:text-white truncate">{task.title}</h6>
                        {task.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {task.source === 'process' || task.processId ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5" />
                              <span>SOP: {task.processTitle || 'Processo'}</span>
                            </span>
                          ) : task.source === 'project' || task.projectId ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                              Projeto
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Manual
                            </span>
                          )}

                          {task.processStepOrder && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              Etapa #{task.processStepOrder}
                            </span>
                          )}

                          <Badge variant="default" className="text-[10px]">{task.priority || 'Média'}</Badge>

                          {task.responsibleRole ? (
                            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">{task.responsibleRole}</span>
                          ) : task.responsible ? (
                            <span className="text-[10px] text-slate-400">Resp: {task.responsible}</span>
                          ) : null}

                          {(task.deadline || task.dueDate) && (
                            <span className="text-[10px] text-slate-400">Prazo: {new Date(task.deadline || task.dueDate).toLocaleDateString('pt-BR')}</span>
                          )}

                          {task.serviceName && (
                            <span className="text-[9px] text-slate-400 font-medium truncate max-w-[120px]">
                              • {task.serviceName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {clientTasks
                  .filter(t => t.status !== 'concluído')
                  .filter(t => {
                    if (taskFilterSource === 'process') return t.source === 'process' || t.processId;
                    if (taskFilterSource === 'manual') return t.source !== 'process' && !t.processId && t.source !== 'project' && !t.projectId;
                    if (taskFilterSource === 'project') return t.source === 'project' || t.projectId;
                    return true;
                  }).length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Nenhuma tarefa pendente para o filtro selecionado.
                  </div>
                )}
              </div>
            </Card>

            {/* Completed Tasks */}
            <Card title={`Concluídas (${clientTasks.filter(t => t.status === 'concluído' && (taskFilterSource === 'all' || (taskFilterSource === 'process' ? (t.source === 'process' || t.processId) : taskFilterSource === 'manual' ? (t.source !== 'process' && !t.processId && t.source !== 'project' && !t.projectId) : (t.source === 'project' || t.projectId)))).length})`}>
              <div className="space-y-3">
                {clientTasks
                  .filter(t => t.status === 'concluído')
                  .filter(t => {
                    if (taskFilterSource === 'process') return t.source === 'process' || t.processId;
                    if (taskFilterSource === 'manual') return t.source !== 'process' && !t.processId && t.source !== 'project' && !t.projectId;
                    if (taskFilterSource === 'project') return t.source === 'project' || t.projectId;
                    return true;
                  })
                  .map(task => (
                  <div key={task.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 opacity-70">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="mt-0.5 p-1 rounded text-emerald-600 hover:text-slate-400"
                        title="Reabrir tarefa"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <div>
                        <h6 className="text-sm font-bold line-through text-slate-500">{task.title}</h6>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Concluída</span>
                          {task.processTitle && (
                            <span className="text-[10px] text-slate-400">({task.processTitle})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {clientTasks
                  .filter(t => t.status === 'concluído')
                  .filter(t => {
                    if (taskFilterSource === 'process') return t.source === 'process' || t.processId;
                    if (taskFilterSource === 'manual') return t.source !== 'process' && !t.processId && t.source !== 'project' && !t.projectId;
                    if (taskFilterSource === 'project') return t.source === 'project' || t.projectId;
                    return true;
                  }).length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Nenhuma tarefa concluída para o filtro selecionado.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 8: HISTÓRICO */}
      {activeTab === 'historico' && (
        <Card title="Linha do Tempo do Cliente" subtitle="Eventos reais identificados nas coleções do sistema">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {/* Event: Client Joined */}
            <div className="relative flex items-start gap-4">
              <div className="absolute -left-6 w-5 h-5 rounded-full bg-violet-600 border-4 border-white dark:border-slate-900"></div>
              <div>
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400">
                  {client.joinedAt ? new Date(client.joinedAt).toLocaleDateString('pt-BR') : 'Data de entrada'}
                </p>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Cliente Cadastrado no ApexFlow</h5>
                <p className="text-xs text-slate-500 mt-1">
                  Cliente registrado sob a empresa {client.company} com status inicial {client.status}.
                </p>
              </div>
            </div>

            {/* Event: Onboarding Started */}
            {clientOnboarding?.startedAt && (
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-6 w-5 h-5 rounded-full bg-blue-500 border-4 border-white dark:border-slate-900"></div>
                <div>
                  <p className="text-xs font-bold text-blue-500">
                    {new Date(clientOnboarding.startedAt).toLocaleDateString('pt-BR')}
                  </p>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Início do Onboarding</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Esteira de onboarding iniciada com {clientOnboarding.steps?.length || 0} etapas.
                  </p>
                </div>
              </div>
            )}

            {/* Event: Contracts */}
            {clientContracts.map(c => (
              <div key={c.id} className="relative flex items-start gap-4">
                <div className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900"></div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : 'Data não informada'}
                  </p>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Contrato Firmado: {c.service}</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Valor mensal de {formatCurrency(c.monthlyValue, hideValues)} ({c.category === 'hosting' ? 'Hospedagem' : 'Recorrência'}).
                  </p>
                </div>
              </div>
            ))}

            {/* Event: Projects */}
            {clientProjects.map(p => (
              <div key={p.id} className="relative flex items-start gap-4">
                <div className="absolute -left-6 w-5 h-5 rounded-full bg-amber-500 border-4 border-white dark:border-slate-900"></div>
                <div>
                  <p className="text-xs font-bold text-amber-500">
                    {p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR') : 'Data de início'}
                  </p>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Projeto Aberto: {p.name}</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    Tipo: {p.type} • Valor: {formatCurrency(p.value, hideValues)} • Status: {p.status}.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal: Add Client Service */}
      <Modal
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        title="Vincular Serviço Operacional ao Cliente"
      >
        <form onSubmit={handleAddClientService} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Selecione o Serviço do Catálogo
            </label>
            <select
              required
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Selecione um serviço...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.category || 'geral'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Data de Início
            </label>
            <input
              type="date"
              value={serviceStartDate}
              onChange={e => setServiceStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Observações / Escopo Operacional
            </label>
            <textarea
              value={serviceNotes}
              onChange={e => setServiceNotes(e.target.value)}
              placeholder="Ex: Campanha de tráfego focada em captação no Google Ads e Meta Ads..."
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={addingServiceLoading}
              className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {addingServiceLoading ? 'Vinculando...' : 'Confirmar Vínculo de Serviço'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Step to Onboarding */}
      <Modal
        isOpen={isNewStepModalOpen}
        onClose={() => setIsNewStepModalOpen(false)}
        title="Adicionar Etapa ao Onboarding"
      >
        <form onSubmit={handleAddOnboardingStep} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título da Etapa</label>
            <input
              type="text"
              required
              value={newStepTitle}
              onChange={e => setNewStepTitle(e.target.value)}
              placeholder="Ex: Validação do Criativo com o Cliente"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição Detalhada</label>
            <textarea
              value={newStepDescription}
              onChange={e => setNewStepDescription(e.target.value)}
              placeholder="Instruções sobre o que precisa ser entregue ou validado nesta etapa..."
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors"
          >
            Adicionar Etapa
          </button>
        </form>
      </Modal>

      {/* Modal: Create Task for this client */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Criar Tarefa para este Cliente"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="Ex: Ajustar criativo de anúncio"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prioridade</label>
              <select
                value={taskPriority}
                onChange={e => setTaskPriority(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Responsável</label>
              <input
                type="text"
                value={taskResponsible}
                onChange={e => setTaskResponsible(e.target.value)}
                placeholder="Ex: Lucas"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prazo</label>
            <input
              type="date"
              value={taskDeadline}
              onChange={e => setTaskDeadline(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingTask}
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {savingTask ? 'Criando...' : 'Criar Tarefa'}
          </button>
        </form>
      </Modal>

      {/* Modal: Generate Tasks from Process / Active Services */}
      <Modal
        isOpen={isGenerateTasksModalOpen}
        onClose={() => {
          setIsGenerateTasksModalOpen(false);
          setTaskGenerationResult(null);
        }}
        title="Gerar Tarefas Operacionais a partir de SOPs"
      >
        <div className="space-y-4">
          {/* Result Alert if generation just happened */}
          {taskGenerationResult && (
            <div className={cn(
              "p-4 rounded-xl border flex items-start gap-3",
              ('totalCreated' in taskGenerationResult ? taskGenerationResult.totalCreated : taskGenerationResult.created) > 0 
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300"
            )}>
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs space-y-1.5 flex-1">
                <p className="font-bold text-sm">
                  {('totalCreated' in taskGenerationResult ? taskGenerationResult.totalCreated : taskGenerationResult.created) > 0 
                    ? "Tarefas operacionais geradas com sucesso!" 
                    : "Idempotência validada: tarefas já existentes"}
                </p>
                <p>{taskGenerationResult.message}</p>
                
                {'results' in taskGenerationResult && taskGenerationResult.results.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
                    {taskGenerationResult.results.map((r, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span>{r.processTitle || r.processId}:</span>
                        <span className="font-semibold">
                          +{r.created} criadas {r.skipped > 0 ? `(${r.skipped} já existiam)` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[11px] opacity-80 pt-1">
                  As novas tarefas já estão disponíveis na aba "Tarefas" deste cliente e no Kanban semanal do ApexFlow.
                </p>
              </div>
            </div>
          )}

          {/* Context box */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Cliente:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{client.company || client.name}</span>
            </div>
            {matchedProcessesForActiveServices.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Serviços Ativos Identificados:</span>
                <span className="font-bold text-violet-600 dark:text-violet-400">
                  {matchedProcessesForActiveServices.length} processo(s) associado(s)
                </span>
              </div>
            )}
          </div>

          {/* Mode Tabs if matched processes exist */}
          {matchedProcessesForActiveServices.length > 0 && (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setGenerationMode('batch_services')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5",
                  generationMode === 'batch_services'
                    ? "bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Serviços Ativos ({matchedProcessesForActiveServices.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode('single_process')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5",
                  generationMode === 'single_process'
                    ? "bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <span>Processo Individual</span>
              </button>
            </div>
          )}

          {/* MODE A: BATCH ACTIVE SERVICES */}
          {generationMode === 'batch_services' && matchedProcessesForActiveServices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Selecione os processos que serão executados:
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchProcessIds(matchedProcessesForActiveServices.map(m => m.process.id))}
                    className="text-violet-600 hover:underline font-semibold"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBatchProcessIds([])}
                    className="text-slate-500 hover:underline font-semibold"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {matchedProcessesForActiveServices.map(({ clientService, service, process: proc, existingTasksCount }) => {
                  const isSelected = selectedBatchProcessIds.includes(proc.id);
                  const activeSteps = (proc.steps || []).filter(s => s.active ?? true);
                  const roles = Array.from(new Set(activeSteps.map(s => s.responsibleRole).filter(Boolean)));

                  return (
                    <div
                      key={proc.id}
                      onClick={() => {
                        setSelectedBatchProcessIds(prev => 
                          isSelected ? prev.filter(id => id !== proc.id) : [...prev, proc.id]
                        );
                      }}
                      className={cn(
                        "p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3",
                        isSelected
                          ? "bg-violet-50/70 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700/80 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div click
                        className="mt-1 h-4 w-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h6 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {proc.title}
                          </h6>
                          {existingTasksCount > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 shrink-0">
                              {existingTasksCount} já geradas
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                              Pronto para gerar
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="font-semibold text-violet-600 dark:text-violet-400">
                            Serviço: {service?.name || proc.serviceName || 'Operação'}
                          </span>
                          <span>•</span>
                          <span>{activeSteps.length} etapas</span>
                          {roles.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[180px]">Papéis: {roles.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE B: SINGLE PROCESS SELECTION */}
          {(generationMode === 'single_process' || matchedProcessesForActiveServices.length === 0) && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Selecione o Processo / SOP Modelo *
                </label>
                <select
                  value={selectedProcessIdForGeneration}
                  onChange={e => {
                    setSelectedProcessIdForGeneration(e.target.value);
                    setTaskGenerationResult(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 font-medium"
                >
                  <option value="">Selecione um processo...</option>
                  {processes.filter(p => (p.active ?? true)).map(p => {
                    const isMatching = selectedServiceForGeneration && (
                      p.serviceId === selectedServiceForGeneration.id ||
                      p.serviceName?.toLowerCase() === selectedServiceForGeneration.name.toLowerCase()
                    );
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title} {isMatching ? '⭐ (Vinculado ao serviço selecionado)' : `[${p.category || 'Geral'}]`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Preview of chosen single process */}
              {(() => {
                const chosenProcess = processes.find(p => p.id === selectedProcessIdForGeneration);
                if (!chosenProcess) return null;

                const activeSteps = (chosenProcess.steps || []).filter(s => (s.active ?? true));
                const uniqueRoles = Array.from(new Set(activeSteps.map(s => s.responsibleRole).filter(Boolean)));

                return (
                  <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                          Pré-Visualização das Tarefas a Gerar
                        </span>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {chosenProcess.title}
                        </h5>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 rounded">
                        {activeSteps.length} tarefas
                      </span>
                    </div>

                    {chosenProcess.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {chosenProcess.description}
                      </p>
                    )}

                    {uniqueRoles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Papéis:</span>
                        {uniqueRoles.map((role, idx) => (
                          <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {role}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Steps Mini Preview */}
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pt-2 border-t border-violet-100 dark:border-violet-900/30 pr-1">
                      {activeSteps.map((step, sIdx) => (
                        <div key={step.id || sIdx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/80 dark:bg-slate-800/80">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <span className="truncate text-slate-800 dark:text-slate-200">{step.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
                            {step.responsibleRole && <span>{step.responsibleRole}</span>}
                            {step.checklist && step.checklist.length > 0 && (
                              <span>({step.checklist.length} itens)</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Geração Idempotente:</strong> O sistema detecta tarefas e etapas já geradas anteriormente para este cliente e nunca duplicará registros.
            </span>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsGenerateTasksModalOpen(false);
                setTaskGenerationResult(null);
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
            >
              {taskGenerationResult ? 'Concluído' : 'Cancelar'}
            </button>

            <button
              type="button"
              disabled={
                generatingTasksLoading || 
                (generationMode === 'batch_services' ? selectedBatchProcessIds.length === 0 : !selectedProcessIdForGeneration)
              }
              onClick={handleExecuteGenerateTasks}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-violet-600/30 disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {generatingTasksLoading 
                  ? 'Gerando Tarefas...' 
                  : generationMode === 'batch_services'
                    ? `Confirmar e Gerar (${selectedBatchProcessIds.length} Processos)`
                    : 'Confirmar e Gerar Tarefas'
                }
              </span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
