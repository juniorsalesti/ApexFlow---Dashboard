import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Layers, 
  CheckCircle2, 
  Edit2, 
  Trash2, 
  Eye, 
  Copy, 
  Clock, 
  User, 
  CheckSquare, 
  Square, 
  ArrowUp, 
  ArrowDown, 
  Power, 
  Sparkles, 
  Briefcase, 
  Tag, 
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Save,
  HelpCircle,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { Process, ProcessStep, Service, Client, TaskGenerationResult } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { cn } from '../lib/utils';
import { 
  addProcess, 
  updateProcess, 
  deleteProcess, 
  duplicateProcess,
  seedDefaultProcesses,
  generateTasksFromProcess
} from '../services/db';

interface ProcessesSectionProps {
  processes: Process[];
  services?: Service[];
  clients?: Client[];
  companyId: string;
}

export const PROCESS_CATEGORIES = [
  { id: 'all', label: 'Todas as Categorias' },
  { id: 'onboarding', label: 'Onboarding Geral' },
  { id: 'trafego', label: 'Gestão de Tráfego' },
  { id: 'social_media', label: 'Gestão de Redes Sociais' },
  { id: 'criativos', label: 'Criação de Artes/Criativos' },
  { id: 'sites', label: 'Criação de Sites' },
  { id: 'landing_pages', label: 'Landing Pages' },
  { id: 'seo', label: 'SEO' },
  { id: 'automacao', label: 'Automação' },
  { id: 'hospedagem', label: 'Hospedagem' },
  { id: 'financeiro', label: 'Financeiro/Administrativo' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'geral', label: 'Geral' }
];

export function formatMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return 'Tempo não est.';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
}

export function ProcessesSection({ processes, services = [], clients = [], companyId }: ProcessesSectionProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');

  // Modals State
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Generate for Client Modal State
  const [isGenerateForClientModalOpen, setIsGenerateForClientModalOpen] = useState(false);
  const [processForClientGen, setProcessForClientGen] = useState<Process | null>(null);
  const [selectedClientIdForGen, setSelectedClientIdForGen] = useState('');
  const [clientGenLoading, setClientGenLoading] = useState(false);
  const [clientGenResult, setClientGenResult] = useState<TaskGenerationResult | null>(null);
  
  // Selected Data
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Form State for Process Editor
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    description: string;
    category: string;
    department: string;
    serviceId: string;
    serviceName: string;
    content: string;
    active: boolean;
    steps: ProcessStep[];
  }>({
    title: '',
    description: '',
    category: 'geral',
    department: '',
    serviceId: '',
    serviceName: '',
    content: '',
    active: true,
    steps: []
  });

  // State for new step or checklist item within editor
  const [newChecklistText, setNewChecklistText] = useState<{ [stepIndex: number]: string }>({});

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  // Filtered processes with defensive legacy handling
  const filteredProcesses = useMemo(() => {
    return processes.filter(p => {
      const pActive = p.active ?? true;
      if (statusFilter === 'active' && !pActive) return false;
      if (statusFilter === 'inactive' && pActive) return false;

      if (selectedCategory !== 'all') {
        const pCat = (p.category || '').toLowerCase();
        const selCat = selectedCategory.toLowerCase();
        if (pCat !== selCat && !pCat.includes(selCat)) return false;
      }

      if (selectedServiceId !== 'all') {
        if (p.serviceId !== selectedServiceId) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const titleMatch = (p.title || '').toLowerCase().includes(term);
        const descMatch = (p.description || '').toLowerCase().includes(term);
        const deptMatch = (p.department || '').toLowerCase().includes(term);
        const srvMatch = (p.serviceName || '').toLowerCase().includes(term);
        if (!titleMatch && !descMatch && !deptMatch && !srvMatch) return false;
      }

      return true;
    });
  }, [processes, statusFilter, selectedCategory, selectedServiceId, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const total = processes.length;
    const active = processes.filter(p => (p.active ?? true)).length;
    const inactive = total - active;
    const totalSteps = processes.reduce((acc, p) => acc + (p.steps?.length || 0), 0);
    return { total, active, inactive, totalSteps };
  }, [processes]);

  // Open Editor for Creating
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedProcess(null);
    setFormData({
      title: '',
      description: '',
      category: 'onboarding',
      department: 'Operações',
      serviceId: '',
      serviceName: '',
      content: '',
      active: true,
      steps: [
        {
          id: `step-${Date.now()}-1`,
          order: 1,
          title: 'Etapa Inicial',
          description: 'Definição e alinhamento preliminar',
          checklist: ['Coleta de informações', 'Validação técnica'],
          estimatedMinutes: 30,
          responsibleRole: 'Operações',
          required: true,
          active: true
        }
      ]
    });
    setNewChecklistText({});
    setIsEditorModalOpen(true);
  };

  // Open Editor for Editing
  const handleOpenEditModal = (process: Process) => {
    setIsEditing(true);
    setSelectedProcess(process);
    setFormData({
      id: process.id,
      title: process.title || '',
      description: process.description || '',
      category: process.category || 'geral',
      department: process.department || '',
      serviceId: process.serviceId || '',
      serviceName: process.serviceName || '',
      content: process.content || '',
      active: process.active ?? true,
      steps: (process.steps || []).map((s, idx) => ({
        ...s,
        id: s.id || `step-${Date.now()}-${idx}`,
        order: s.order || idx + 1,
        title: s.title || '',
        description: s.description || '',
        checklist: Array.isArray(s.checklist) ? [...s.checklist] : [],
        estimatedMinutes: s.estimatedMinutes || 15,
        responsibleRole: s.responsibleRole || '',
        required: s.required ?? true,
        active: s.active ?? true
      }))
    });
    setNewChecklistText({});
    setIsEditorModalOpen(true);
  };

  // Open Viewer
  const handleOpenViewModal = (process: Process) => {
    setSelectedProcess(process);
    setIsViewModalOpen(true);
  };

  // Open Generate for Client Modal
  const handleOpenGenerateForClient = (process: Process) => {
    setProcessForClientGen(process);
    setClientGenResult(null);
    if (clients.length > 0 && !selectedClientIdForGen) {
      setSelectedClientIdForGen(clients[0].id);
    }
    setIsGenerateForClientModalOpen(true);
  };

  // Execute Generate for Client
  const handleExecuteGenerateForClient = async () => {
    if (!processForClientGen) return;
    if (!selectedClientIdForGen) {
      alert('Selecione um cliente para gerar as tarefas.');
      return;
    }
    if (!companyId) {
      alert('Empresa não selecionada.');
      return;
    }

    setClientGenLoading(true);
    setClientGenResult(null);
    try {
      const result = await generateTasksFromProcess({
        clientId: selectedClientIdForGen,
        companyId,
        processId: processForClientGen.id,
        serviceId: processForClientGen.serviceId || '',
        serviceName: processForClientGen.serviceName || ''
      });
      setClientGenResult(result);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao gerar tarefas.');
    } finally {
      setClientGenLoading(false);
    }
  };

  // Toggle Process Active Status
  const handleToggleActive = async (e: React.MouseEvent, process: Process) => {
    e.stopPropagation();
    try {
      const currentActive = process.active ?? true;
      await updateProcess(process.id, { active: !currentActive });
      showNotification(`Processo "${process.title}" ${!currentActive ? 'ativado' : 'desativado'} com sucesso.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Duplicate Process
  const handleDuplicate = async (e: React.MouseEvent, process: Process) => {
    e.stopPropagation();
    if (!companyId) return;
    setLoading(true);
    try {
      await duplicateProcess(process, companyId);
      showNotification(`Processo "${process.title}" duplicado com sucesso.`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete Process Confirmation
  const handleDeleteProcess = async () => {
    if (!selectedProcess) return;
    setLoading(true);
    try {
      await deleteProcess(selectedProcess.id);
      setIsDeleteModalOpen(false);
      setSelectedProcess(null);
      showNotification('Processo excluído com sucesso.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Seed Default Processes (Idempotent)
  const handleSeedDefaults = async () => {
    if (!companyId) return;
    setSeedingLoading(true);
    try {
      await seedDefaultProcesses(companyId);
      showNotification('Biblioteca de processos padrão sincronizada com sucesso.');
    } catch (err) {
      console.error(err);
    } finally {
      setSeedingLoading(false);
    }
  };

  // Step Management in Editor
  const handleAddStep = () => {
    const newOrder = formData.steps.length + 1;
    const newStep: ProcessStep = {
      id: `step-${Date.now()}-${formData.steps.length}`,
      order: newOrder,
      title: `Nova Etapa ${newOrder}`,
      description: '',
      checklist: [],
      estimatedMinutes: 30,
      responsibleRole: '',
      required: true,
      active: true
    };
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const handleUpdateStep = (index: number, updates: Partial<ProcessStep>) => {
    setFormData(prev => {
      const updatedSteps = [...prev.steps];
      updatedSteps[index] = { ...updatedSteps[index], ...updates };
      return { ...prev, steps: updatedSteps };
    });
  };

  const handleDeleteStep = (index: number) => {
    setFormData(prev => {
      const updatedSteps = prev.steps.filter((_, i) => i !== index).map((s, i) => ({
        ...s,
        order: i + 1
      }));
      return { ...prev, steps: updatedSteps };
    });
  };

  const handleDuplicateStep = (index: number) => {
    setFormData(prev => {
      const stepToCopy = prev.steps[index];
      const newStep: ProcessStep = {
        ...stepToCopy,
        id: `step-${Date.now()}-${prev.steps.length}`,
        title: `${stepToCopy.title} (Cópia)`,
        checklist: Array.isArray(stepToCopy.checklist) ? [...stepToCopy.checklist] : []
      };
      const updatedSteps = [...prev.steps];
      updatedSteps.splice(index + 1, 0, newStep);
      return {
        ...prev,
        steps: updatedSteps.map((s, i) => ({ ...s, order: i + 1 }))
      };
    });
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === formData.steps.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setFormData(prev => {
      const updatedSteps = [...prev.steps];
      const temp = updatedSteps[index];
      updatedSteps[index] = updatedSteps[targetIndex];
      updatedSteps[targetIndex] = temp;
      return {
        ...prev,
        steps: updatedSteps.map((s, i) => ({ ...s, order: i + 1 }))
      };
    });
  };

  // Checklist Items within Step
  const handleAddChecklistItem = (stepIndex: number) => {
    const text = (newChecklistText[stepIndex] || '').trim();
    if (!text) return;

    setFormData(prev => {
      const updatedSteps = [...prev.steps];
      const currentList = Array.isArray(updatedSteps[stepIndex].checklist) 
        ? [...updatedSteps[stepIndex].checklist!] 
        : [];
      currentList.push(text);
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        checklist: currentList
      };
      return { ...prev, steps: updatedSteps };
    });

    setNewChecklistText(prev => ({ ...prev, [stepIndex]: '' }));
  };

  const handleDeleteChecklistItem = (stepIndex: number, itemIndex: number) => {
    setFormData(prev => {
      const updatedSteps = [...prev.steps];
      const currentList = Array.isArray(updatedSteps[stepIndex].checklist) 
        ? [...updatedSteps[stepIndex].checklist!] 
        : [];
      currentList.splice(itemIndex, 1);
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        checklist: currentList
      };
      return { ...prev, steps: updatedSteps };
    });
  };

  const handleMoveChecklistItem = (stepIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    setFormData(prev => {
      const updatedSteps = [...prev.steps];
      const currentList = Array.isArray(updatedSteps[stepIndex].checklist) 
        ? [...updatedSteps[stepIndex].checklist!] 
        : [];
      if ((direction === 'up' && itemIndex === 0) || (direction === 'down' && itemIndex === currentList.length - 1)) {
        return prev;
      }
      const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      const temp = currentList[itemIndex];
      currentList[itemIndex] = currentList[targetIndex];
      currentList[targetIndex] = temp;

      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        checklist: currentList
      };
      return { ...prev, steps: updatedSteps };
    });
  };

  // Submit Process Editor Form
  const handleSaveProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Por favor, informe o título do processo.');
      return;
    }

    // Validation: no empty titles in steps
    const hasInvalidStep = formData.steps.some(s => !s.title || !s.title.trim());
    if (hasInvalidStep) {
      alert('Todas as etapas precisam ter um título preenchido antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      // Find service name if serviceId is set
      let assignedServiceName = formData.serviceName;
      if (formData.serviceId) {
        const found = services.find(s => s.id === formData.serviceId);
        if (found) assignedServiceName = found.name;
      }

      const processPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        department: formData.department.trim(),
        serviceId: formData.serviceId || '',
        serviceName: assignedServiceName || '',
        content: formData.content.trim(),
        active: formData.active,
        steps: formData.steps.map((s, idx) => ({
          id: s.id || `step-${idx + 1}`,
          order: idx + 1,
          title: s.title.trim(),
          description: (s.description || '').trim(),
          checklist: Array.isArray(s.checklist) ? s.checklist.map(c => c.trim()).filter(Boolean) : [],
          estimatedMinutes: Number(s.estimatedMinutes) || 0,
          responsibleRole: (s.responsibleRole || '').trim(),
          required: s.required ?? true,
          active: s.active ?? true
        }))
      };

      if (isEditing && formData.id) {
        await updateProcess(formData.id, processPayload);
        showNotification(`Processo "${processPayload.title}" atualizado com sucesso.`);
      } else {
        await addProcess(processPayload, companyId);
        showNotification(`Novo processo "${processPayload.title}" criado com sucesso.`);
      }

      setIsEditorModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao salvar o processo. Verifique as permissões.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total estimated minutes for a process
  const calculateProcessTotalMinutes = (proc: Process) => {
    if (!proc.steps || proc.steps.length === 0) return 0;
    return proc.steps
      .filter(s => (s.active ?? true))
      .reduce((acc, s) => acc + (s.estimatedMinutes || 0), 0);
  };

  // Category label helper
  const getCategoryLabel = (catId?: string) => {
    if (!catId) return 'Geral';
    const found = PROCESS_CATEGORIES.find(c => c.id === catId);
    return found ? found.label : catId;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{actionSuccessMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              Processos e SOPs
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40">
              Biblioteca ApexFlow OS
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Padronize como a ApexFlow executa cada serviço. Modelos reutilizáveis para garantir excelência operacional.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeedDefaults}
            disabled={seedingLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            title="Sincronizar processos padrão recomendados da ApexFlow"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", seedingLoading && "animate-spin")} />
            <span className="hidden sm:inline">Restaurar Modelos Padrão</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-md shadow-violet-600/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Processo</span>
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Total de Processos
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.total}</span>
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Processos Ativos
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.active}</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Processos Inativos
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-500 dark:text-slate-400">{metrics.inactive}</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
              <Power className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Etapas Padronizadas
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.totalSteps}</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar processo por título, departamento ou serviço..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs md:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 w-full lg:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "flex-1 lg:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                statusFilter === 'all' 
                  ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Todos ({processes.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={cn(
                "flex-1 lg:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                statusFilter === 'active' 
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Ativos ({metrics.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={cn(
                "flex-1 lg:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                statusFilter === 'inactive' 
                  ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Inativos ({metrics.inactive})
            </button>
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Filtrar por:</span>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {/* Category select */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500"
            >
              {PROCESS_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            {/* Service select */}
            <select
              value={selectedServiceId}
              onChange={e => setSelectedServiceId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">Todos os Serviços Vinculados</option>
              {services.map(srv => (
                <option key={srv.id} value={srv.id}>{srv.name}</option>
              ))}
            </select>
          </div>

          {(selectedCategory !== 'all' || selectedServiceId !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedServiceId('all');
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-xs text-violet-600 hover:text-violet-700 font-bold whitespace-nowrap px-2 py-1"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* PROCESS CARDS GRID */}
      {filteredProcesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProcesses.map(proc => {
            const isActive = proc.active ?? true;
            const stepsCount = proc.steps?.length || 0;
            const totalMinutes = calculateProcessTotalMinutes(proc);

            return (
              <div
                key={proc.id}
                className={cn(
                  "group relative bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between",
                  isActive 
                    ? "border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700/60" 
                    : "border-slate-200/60 dark:border-slate-800/50 opacity-70 bg-slate-50/50 dark:bg-slate-900/40"
                )}
              >
                <div>
                  {/* Card Header badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40">
                        {getCategoryLabel(proc.category)}
                      </span>

                      {proc.serviceName && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Briefcase className="w-2.5 h-2.5 text-slate-400" />
                          <span className="truncate max-w-[130px]">{proc.serviceName}</span>
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <button
                      onClick={(e) => handleToggleActive(e, proc)}
                      className={cn(
                        "text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 transition-transform hover:scale-105 active:scale-95",
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                      )}
                      title={isActive ? "Clique para desativar este processo" : "Clique para ativar este processo"}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                      {isActive ? 'ATIVO' : 'INATIVO'}
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 
                    onClick={() => handleOpenViewModal(proc)}
                    className="text-base font-bold text-slate-900 dark:text-white cursor-pointer group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1 mb-1.5"
                    title={proc.title}
                  >
                    {proc.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {proc.description || 'Sem descrição cadastrada para este processo padrão.'}
                  </p>

                  {/* Highlights / Meta */}
                  <div className="grid grid-cols-2 gap-2 py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs mb-4">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CheckSquare className="w-3.5 h-3.5 text-violet-500" />
                      <span className="font-semibold">{stepsCount} {stepsCount === 1 ? 'etapa' : 'etapas'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-semibold">{formatMinutes(totalMinutes)}</span>
                    </div>
                  </div>

                  {/* Mini steps preview list (up to 3 steps) */}
                  {proc.steps && proc.steps.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      {proc.steps.slice(0, 3).map((s, idx) => (
                        <div key={s.id || idx} className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{s.title}</span>
                          {s.checklist && s.checklist.length > 0 && (
                            <span className="text-[9px] text-slate-400 ml-auto shrink-0 font-medium">
                              ({s.checklist.length} itens)
                            </span>
                          )}
                        </div>
                      ))}
                      {proc.steps.length > 3 && (
                        <p className="text-[10px] text-slate-400 font-semibold pl-6">
                          + {proc.steps.length - 3} etapas adicionais
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleOpenViewModal(proc)}
                    className="flex-1 py-1.5 px-2 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar</span>
                  </button>

                  {isActive && (
                    <button
                      onClick={() => handleOpenGenerateForClient(proc)}
                      className="py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                      title="Gerar tarefas operacionais deste processo para um cliente"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Gerar</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditModal(proc)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg transition-colors"
                    title="Editar Processo e Etapas"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDuplicate(e, proc)}
                    disabled={loading}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                    title="Duplicar Processo (Criar Cópia)"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleToggleActive(e, proc)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 rounded-lg transition-colors"
                    title={isActive ? "Desativar" : "Ativar"}
                  >
                    <Power className={cn("w-4 h-4", isActive ? "text-slate-400" : "text-amber-500")} />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedProcess(proc);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Excluir Processo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhum processo encontrado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Não encontramos processos com os filtros atuais. Você pode criar um novo processo ou carregar os modelos padrão recomendados.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSeedDefaults}
              disabled={seedingLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", seedingLoading && "animate-spin")} />
              <span>Carregar Modelos Padrão da ApexFlow</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Novo Processo</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: VIEW PROCESS DETAILS */}
      {/* ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedProcess(null);
        }}
        title="Visualização Detalhada do Processo / SOP"
      >
        {selectedProcess && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                  {getCategoryLabel(selectedProcess.category)}
                </span>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1",
                    (selectedProcess.active ?? true)
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", (selectedProcess.active ?? true) ? "bg-emerald-500" : "bg-slate-400")} />
                    {(selectedProcess.active ?? true) ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedProcess.title}
                </h2>
                {selectedProcess.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {selectedProcess.description}
                  </p>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Serviço Associado</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedProcess.serviceName || 'Geral (Todos)'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Departamento</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedProcess.department || 'Operações'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Tempo Estimado Total</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-violet-500" />
                    {formatMinutes(calculateProcessTotalMinutes(selectedProcess))}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Content if present */}
            {selectedProcess.content && (
              <div className="p-4 bg-violet-50/60 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900/30">
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-1">
                  Diretrizes & Instruções do SOP
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedProcess.content}
                </p>
              </div>
            )}

            {/* Steps Timeline / List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-violet-600" />
                  Etapas Ordenadas do Processo ({selectedProcess.steps?.length || 0})
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedProcess.steps?.filter(s => s.required).length || 0} obrigatórias
                </span>
              </div>

              {selectedProcess.steps && selectedProcess.steps.length > 0 ? (
                <div className="space-y-3">
                  {selectedProcess.steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        (step.active ?? true)
                          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 opacity-60"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                              ETAPA {String(idx + 1).padStart(2, '0')}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {step.title}
                            </h4>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {step.required ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                              Obrigatória
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                              Opcional
                            </span>
                          )}

                          {step.estimatedMinutes ? (
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {step.estimatedMinutes} min
                            </span>
                          ) : null}

                          {step.responsibleRole && (
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded">
                              <User className="w-3 h-3 text-violet-500" />
                              {step.responsibleRole}
                            </span>
                          )}
                        </div>
                      </div>

                      {step.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 pl-8 mb-3 leading-relaxed">
                          {step.description}
                        </p>
                      )}

                      {/* Checklist items */}
                      {step.checklist && step.checklist.length > 0 && (
                        <div className="pl-8 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">
                            Checklist de Verificação ({step.checklist.length} itens):
                          </p>
                          <div className="space-y-1.5">
                            {step.checklist.map((item, cIdx) => (
                              <div key={cIdx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Nenhuma etapa cadastrada neste processo.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenEditModal(selectedProcess);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Este Processo</span>
                </button>

                {(selectedProcess.active ?? true) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleOpenGenerateForClient(selectedProcess);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar Tarefas para Cliente</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: GENERATE TASKS FOR CLIENT */}
      <Modal
        isOpen={isGenerateForClientModalOpen}
        onClose={() => {
          setIsGenerateForClientModalOpen(false);
          setClientGenResult(null);
        }}
        title="Gerar Tarefas a partir deste Processo (SOP)"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crie automaticamente as tarefas operacionais correspondentes às etapas deste processo para um cliente.
          </p>

          {processForClientGen && (
            <div className="p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/30 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-violet-600 uppercase">Processo Selecionado:</span>
              <h5 className="font-bold text-sm text-slate-900 dark:text-white">{processForClientGen.title}</h5>
              <div className="flex gap-3 text-xs text-slate-500 pt-1">
                <span>{(processForClientGen.steps || []).filter(s => s.active ?? true).length} etapas ativas</span>
                <span>Tempo total: {formatMinutes(calculateProcessTotalMinutes(processForClientGen))}</span>
              </div>
            </div>
          )}

          {clientGenResult && (
            <div className={cn(
              "p-4 rounded-xl border text-xs space-y-1.5",
              clientGenResult.created > 0 
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
            )}>
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Resultado da Geração</span>
              </div>
              <p>{clientGenResult.message}</p>
              <div className="flex gap-4 text-[11px] pt-1">
                <span>Criadas: <strong>{clientGenResult.created}</strong></span>
                <span>Já existentes (preservadas): <strong>{clientGenResult.skipped}</strong></span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Selecione o Cliente Destino *
            </label>
            <select
              value={selectedClientIdForGen}
              onChange={e => setSelectedClientIdForGen(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Selecione um cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Geração Idempotente:</strong> O sistema detecta se etapas deste processo já foram geradas para este cliente e nunca criará tarefas duplicadas.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsGenerateForClientModalOpen(false);
                setClientGenResult(null);
              }}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {clientGenResult ? 'Concluir' : 'Cancelar'}
            </button>
            <button
              type="button"
              disabled={clientGenLoading || !selectedClientIdForGen || !processForClientGen}
              onClick={handleExecuteGenerateForClient}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{clientGenLoading ? 'Gerando Tarefas...' : 'Confirmar e Gerar Tarefas'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: CREATE / EDIT PROCESS (FULL EDITOR) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        title={isEditing ? 'Editar Processo / SOP' : 'Novo Processo / SOP'}
      >
        <form onSubmit={handleSaveProcess} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1">
              1. Informações Principais
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Nome do Processo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Onboarding de Gestão de Tráfego"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Descrição do Processo
              </label>
              <textarea
                rows={2}
                placeholder="Objetivo e escopo deste procedimento operacional..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Categoria *
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {PROCESS_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Service Association */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Serviço Associado (ApexFlow Services)
                </label>
                <select
                  value={formData.serviceId}
                  onChange={e => {
                    const sId = e.target.value;
                    const found = services.find(s => s.id === sId);
                    setFormData({
                      ...formData,
                      serviceId: sId,
                      serviceName: found ? found.name : ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Geral / Sem serviço específico</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Departamento Responsável
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mídia, Criação, Desenvolvimento"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Active Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Status do Processo
                </label>
                <div className="flex items-center gap-3 pt-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={e => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                    />
                    <span>Processo Ativo</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Documentação Técnica / Conteúdo do SOP
              </label>
              <textarea
                rows={2}
                placeholder="Instruções adicionais, links de ferramentas, políticas de qualidade..."
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
            </div>
          </div>

          {/* Section: Steps & Checklists */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
              <div>
                <h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  2. Etapas e Checklists ({formData.steps.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Defina a sequência de execução e itens de checklist de cada etapa.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Etapa</span>
              </button>
            </div>

            {formData.steps.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-xs text-slate-500">Nenhuma etapa cadastrada ainda.</p>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="mt-2 text-xs font-bold text-violet-600 hover:text-violet-700 underline"
                >
                  Clique aqui para adicionar a primeira etapa
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.steps.map((step, sIdx) => (
                  <div
                    key={step.id || sIdx}
                    className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 relative group"
                  >
                    {/* Step Card Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-violet-600 text-white text-xs font-bold flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Etapa #{sIdx + 1}
                        </span>
                      </div>

                      {/* Reorder and action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={sIdx === 0}
                          onClick={() => handleMoveStep(sIdx, 'up')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded disabled:opacity-30"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={sIdx === formData.steps.length - 1}
                          onClick={() => handleMoveStep(sIdx, 'down')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded disabled:opacity-30"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateStep(sIdx)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 rounded"
                          title="Duplicar etapa"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(sIdx)}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 rounded"
                          title="Excluir etapa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Step Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          Título da Etapa *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Solicitar acessos ao cliente"
                          value={step.title}
                          onChange={e => handleUpdateStep(sIdx, { title: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          Descrição / Orientações da Etapa
                        </label>
                        <input
                          type="text"
                          placeholder="Detalhes ou passo a passo sobre a execução..."
                          value={step.description || ''}
                          onChange={e => handleUpdateStep(sIdx, { description: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          Papel / Cargo Responsável
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Gestor de Tráfego, Designer, DevOps"
                          value={step.responsibleRole || ''}
                          onChange={e => handleUpdateStep(sIdx, { responsibleRole: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          Tempo Estimado (minutos)
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="30"
                          value={step.estimatedMinutes || ''}
                          onChange={e => handleUpdateStep(sIdx, { estimatedMinutes: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div className="flex items-center gap-4 sm:col-span-2 pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={step.required ?? true}
                            onChange={e => handleUpdateStep(sIdx, { required: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500"
                          />
                          <span>Etapa Obrigatória</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={step.active ?? true}
                            onChange={e => handleUpdateStep(sIdx, { active: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500"
                          />
                          <span>Etapa Ativa</span>
                        </label>
                      </div>
                    </div>

                    {/* Step Checklist Items Sub-section */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Itens de Checklist ({step.checklist?.length || 0})
                      </span>

                      {/* Items list */}
                      {step.checklist && step.checklist.length > 0 && (
                        <div className="space-y-1.5">
                          {step.checklist.map((item, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-center justify-between gap-2 p-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate text-slate-800 dark:text-slate-200">{item}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={cIdx === 0}
                                  onClick={() => handleMoveChecklistItem(sIdx, cIdx, 'up')}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={cIdx === (step.checklist?.length || 0) - 1}
                                  onClick={() => handleMoveChecklistItem(sIdx, cIdx, 'down')}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-20"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChecklistItem(sIdx, cIdx)}
                                  className="p-0.5 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Item Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Novo item de checklist (ex: Validar Pixel no site)..."
                          value={newChecklistText[sIdx] || ''}
                          onChange={e => setNewChecklistText({ ...newChecklistText, [sIdx]: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddChecklistItem(sIdx);
                            }
                          }}
                          className="flex-1 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-violet-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddChecklistItem(sIdx)}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
            <button
              type="button"
              onClick={() => setIsEditorModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-violet-600/30 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Processo'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProcess(null);
        }}
        title="Confirmar Exclusão de Processo"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <p className="font-bold text-sm">Atenção!</p>
              <p>
                Você está prestes a excluir o processo <strong>"{selectedProcess?.title}"</strong>.
              </p>
              <p>
                Esta ação é irreversível e removerá este modelo de processo da biblioteca. Clientes e tarefas existentes não serão afetados.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedProcess(null);
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDeleteProcess}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
