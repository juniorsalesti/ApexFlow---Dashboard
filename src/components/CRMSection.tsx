import React, { useState, useMemo } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { StatCard } from './ui/StatCard';
import { formatCurrency, formatPercent } from '../lib/utils';
import { 
  addLead, 
  updateLead, 
  deleteLead, 
  addClient, 
  addContract, 
  addProject 
} from '../services/db';
import { 
  Plus, 
  MoreVertical, 
  Phone, 
  Mail, 
  Building2, 
  DollarSign, 
  User, 
  Calendar, 
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Briefcase
} from 'lucide-react';

const COLUMNS = [
  { id: 'lead', title: 'Lead', color: 'bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400' },
  { id: 'contact', title: 'Contato Iniciado', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'meeting', title: 'Reunião Agendada', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'proposal', title: 'Proposta Enviada', color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { id: 'won', title: 'Fechado (Ganho)', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { id: 'lost', title: 'Perdido', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
];

interface CRMSectionProps {
  leads: any[];
  clients: any[];
  projects: any[];
  contracts: any[];
}

export function CRMSection({ leads, clients, projects, contracts }: CRMSectionProps) {
  const { selectedCompanyId, companies } = useCompany();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    source: '',
    value: 0,
    status: 'lead',
    owner: '',
    notes: '',
    companyId: ''
  });

  const [wonFormData, setWonFormData] = useState({
    type: 'contract', // 'contract' or 'project'
    monthlyValue: 0,
    projectValue: 0,
    service: '',
    projectType: 'Site'
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const wonLeads = leads.filter(l => l.status === 'won').length;
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
    const potentialRevenue = leads
      .filter(l => l.status !== 'won' && l.status !== 'lost')
      .reduce((acc, curr) => acc + (curr.value || 0), 0);
    const avgTicket = wonLeads > 0 
      ? leads.filter(l => l.status === 'won').reduce((acc, curr) => acc + (curr.value || 0), 0) / wonLeads 
      : 0;

    return { totalLeads, conversionRate, potentialRevenue, avgTicket };
  }, [leads]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = selectedCompanyId || formData.companyId;
    if (!companyId) {
      return;
    }
    setLoading(true);
    try {
      await addLead(formData, companyId);
      setIsModalOpen(false);
      setFormData({
        name: '',
        company: '',
        phone: '',
        email: '',
        source: '',
        value: 0,
        status: 'lead',
        owner: '',
        notes: '',
        companyId: ''
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (newStatus === 'won' && lead.status !== 'won') {
      setSelectedLead(lead);
      setIsWonModalOpen(true);
      return;
    }

    try {
      await updateLead(leadId, { status: newStatus });
    } catch (error) {
      console.error(error);
    }
  };

  const handleWonIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !selectedCompanyId) return;
    setLoading(true);
    try {
      // 1. Create Client
      const clientRes = await addClient({
        name: selectedLead.name,
        company: selectedLead.company,
        status: 'active',
        type: wonFormData.type === 'contract' ? 'recurrent' : 'project'
      }, selectedCompanyId);

      if (clientRes) {
        // 2. Create Contract or Project
        if (wonFormData.type === 'contract') {
          await addContract({
            clientId: clientRes.id,
            monthlyValue: wonFormData.monthlyValue,
            service: wonFormData.service,
            status: 'active'
          }, selectedCompanyId);
        } else {
          await addProject({
            clientId: clientRes.id,
            name: `${selectedLead.company} - ${wonFormData.projectType}`,
            type: wonFormData.projectType,
            value: wonFormData.projectValue,
            status: 'execution',
            origin: 'crm'
          }, selectedCompanyId);
        }
      }

      // 3. Update Lead Status
      await updateLead(selectedLead.id, { status: 'won' });
      setIsWonModalOpen(false);
      setSelectedLead(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // Check if dropped over a column or another lead
    const targetColumn = COLUMNS.find(c => c.id === overId);
    if (targetColumn) {
      handleUpdateStatus(leadId, targetColumn.id);
    } else {
      const targetLead = leads.find(l => l.id === overId);
      if (targetLead && targetLead.status !== leads.find(l => l.id === leadId)?.status) {
        handleUpdateStatus(leadId, targetLead.status);
      }
    }

    setActiveId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Pipeline de Vendas</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Gerencie seus leads e converta em clientes</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Leads" value={metrics.totalLeads} icon={User} />
        <StatCard title="Taxa de Conversão" value={metrics.conversionRate} icon={TrendingUp} isPercent />
        <StatCard title="Ticket Médio" value={metrics.avgTicket} icon={DollarSign} isCurrency />
        <StatCard title="Receita Potencial" value={metrics.potentialRevenue} icon={DollarSign} isCurrency />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 min-h-[600px] snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {COLUMNS.map(column => (
            <KanbanColumn 
              key={column.id} 
              column={column} 
              leads={leads.filter(l => l.status === column.id)} 
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeId ? (
            <LeadCard lead={leads.find(l => l.id === activeId)} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New Lead Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lead">
        <form onSubmit={handleAddLead} className="space-y-4">
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
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Empresa</label>
              <input 
                type="text" 
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Telefone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Origem</label>
              <input 
                type="text" 
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                placeholder="Ex: Instagram, Indicação"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Valor Potencial</label>
              <input 
                type="number" 
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Responsável</label>
            <input 
              type="text" 
              value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Observações</label>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white min-h-[80px]"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar Lead'}
          </button>
        </form>
      </Modal>

      {/* Won Integration Modal */}
      <Modal isOpen={isWonModalOpen} onClose={() => setIsWonModalOpen(false)} title="Converter Lead em Cliente">
        <form onSubmit={handleWonIntegration} className="space-y-6">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
            <p className="text-sm text-emerald-800 dark:text-emerald-400 font-medium">
              Parabéns! O lead <strong>{selectedLead?.company}</strong> foi fechado. 
              Vamos criar o registro de cliente e o serviço associado.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Tipo de Entrega</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setWonFormData({ ...wonFormData, type: 'contract' })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    wonFormData.type === 'contract' 
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <Calendar className={`w-5 h-5 mb-2 ${wonFormData.type === 'contract' ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-600'}`} />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Contrato Recorrente</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Fee mensal, Social Media, etc.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setWonFormData({ ...wonFormData, type: 'project' })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    wonFormData.type === 'project' 
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <Briefcase className={`w-5 h-5 mb-2 ${wonFormData.type === 'project' ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-600'}`} />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Projeto (One-Time)</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Site, Branding, Automação.</p>
                </button>
              </div>
            </div>

            {wonFormData.type === 'contract' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Valor Mensal (R$)</label>
                  <input 
                    type="number" 
                    value={wonFormData.monthlyValue}
                    onChange={(e) => setWonFormData({ ...wonFormData, monthlyValue: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Serviço</label>
                  <input 
                    type="text" 
                    value={wonFormData.service}
                    onChange={(e) => setWonFormData({ ...wonFormData, service: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                    placeholder="Ex: Gestão de Tráfego"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Valor do Projeto (R$)</label>
                  <input 
                    type="number" 
                    value={wonFormData.projectValue}
                    onChange={(e) => setWonFormData({ ...wonFormData, projectValue: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tipo de Projeto</label>
                  <select 
                    value={wonFormData.projectType}
                    onChange={(e) => setWonFormData({ ...wonFormData, projectType: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                  >
                    <option value="Site">Site</option>
                    <option value="Landing Page">Landing Page</option>
                    <option value="Branding">Branding</option>
                    <option value="Automação">Automação</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Processando...' : (
              <>
                Confirmar Fechamento
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}

function KanbanColumn({ column, leads }: { column: any, leads: any[], key?: any }) {
  return (
    <div className="flex-shrink-0 w-[280px] md:w-80 flex flex-col gap-4 snap-center">
      <div className={`flex items-center justify-between px-4 py-2 rounded-lg border transition-colors ${column.color} dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider">{column.title}</span>
        </div>
        <span className="text-xs font-bold opacity-60">{leads.length}</span>
      </div>

      <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 p-1 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl min-h-[500px] transition-colors">
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
          {leads.length === 0 && (
            <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest">Vazio</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function LeadCard({ lead, isOverlay }: { lead: any, isOverlay?: boolean, key?: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (!lead) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-grab active:cursor-grabbing group ${isOverlay ? 'shadow-xl border-violet-400 rotate-2' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h5 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{lead.company}</h5>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{lead.name}</p>
        </div>
        <button className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-slate-400 dark:text-slate-600" />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {lead.value > 0 && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            {formatCurrency(lead.value)}
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <Building2 className="w-3 h-3" />
          {lead.source || 'Origem não informada'}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center">
            <span className="text-[8px] font-bold text-violet-600 dark:text-violet-400">{lead.owner?.charAt(0) || 'U'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.phone && <Phone className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
          {lead.email && <Mail className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
        </div>
      </div>
    </div>
  );
}
