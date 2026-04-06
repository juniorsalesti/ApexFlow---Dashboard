import React, { useState, useMemo } from 'react';
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
import { useCompany } from '../contexts/CompanyContext';
import { addTask, updateTask, deleteTask } from '../services/db';
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Edit2,
  Building2,
  Briefcase,
  Target,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';

const DAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

interface TasksSectionProps {
  tasks: any[];
  clients: any[];
  projects: any[];
  leads: any[];
}

export function TasksSection({ tasks, clients, projects, leads }: TasksSectionProps) {
  const { selectedCompanyId, companies } = useCompany();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    responsible: '',
    priority: 'média',
    status: 'a fazer',
    date: DAYS[0],
    clientId: '',
    projectId: '',
    leadId: '',
    deadline: '',
    companyId: ''
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
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'concluído').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    const today = new Date().toISOString().split('T')[0];
    const delayed = tasks.filter(t => t.status !== 'concluído' && t.deadline && t.deadline < today).length;

    const byResponsible = tasks.reduce((acc: any, curr) => {
      if (!curr.responsible) return acc;
      if (!acc[curr.responsible]) acc[curr.responsible] = { total: 0, completed: 0 };
      acc[curr.responsible].total++;
      if (curr.status === 'concluído') acc[curr.responsible].completed++;
      return acc;
    }, {});

    return { total, completionRate, delayed, byResponsible };
  }, [tasks]);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = selectedCompanyId || formData.companyId;
    if (!companyId) {
      alert('Por favor, selecione uma empresa para vincular esta tarefa.');
      return;
    }
    setLoading(true);
    try {
      if (selectedTask) {
        await updateTask(selectedTask.id, formData);
      } else {
        await addTask(formData, companyId);
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
      title: '',
      description: '',
      responsible: '',
      priority: 'média',
      status: 'a fazer',
      date: DAYS[0],
      clientId: '',
      projectId: '',
      leadId: '',
      deadline: '',
      companyId: ''
    });
    setSelectedTask(null);
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await deleteTask(id);
    } catch (error) {
      console.error(error);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    
    // If hovering over a day column
    if (DAYS.includes(overId)) {
      if (activeTask.date !== overId) {
        updateTask(activeTask.id, { date: overId });
      }
    } else {
      // If hovering over another task
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && activeTask.date !== overTask.date) {
        updateTask(activeTask.id, { date: overTask.date });
      }
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Gestão de Tarefas</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Organize sua semana e acompanhe a produtividade</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tarefas na Semana" value={metrics.total} icon={Calendar} />
        <StatCard title="Concluídas (%)" value={metrics.completionRate} icon={CheckCircle2} isPercent />
        <StatCard title="Atrasadas" value={metrics.delayed} icon={AlertCircle} className={metrics.delayed > 0 ? 'border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900/30' : ''} />
        <StatCard title="Responsáveis Ativos" value={Object.keys(metrics.byResponsible).length} icon={User} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6 -mx-8 px-8 scrollbar-hide">
          {DAYS.map(day => (
            <TaskColumn 
              key={day} 
              id={day} 
              title={day} 
              tasks={tasks.filter(t => t.date === day)}
              onQuickAdd={() => {
                if (!selectedCompanyId) {
                  alert('Selecione uma empresa específica para adicionar tarefas.');
                  return;
                }
                setFormData({ ...formData, date: day });
                setIsModalOpen(true);
              }}
              onEdit={(task: any) => {
                setSelectedTask(task);
                setFormData({
                  title: task.title,
                  description: task.description || '',
                  responsible: task.responsible || '',
                  priority: task.priority || 'média',
                  status: task.status || 'a fazer',
                  date: task.date,
                  clientId: task.clientId || '',
                  projectId: task.projectId || '',
                  leadId: task.leadId || '',
                  deadline: task.deadline || ''
                });
                setIsModalOpen(true);
              }}
              onDelete={handleDeleteTask}
              onStatusToggle={async (task: any) => {
                const newStatus = task.status === 'concluído' ? 'a fazer' : 'concluído';
                await updateTask(task.id, { status: newStatus });
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <TaskCard 
              task={tasks.find(t => t.id === activeId)} 
              isOverlay 
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={selectedTask ? "Editar Tarefa" : "Nova Tarefa"}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          {!selectedCompanyId && !selectedTask && (
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Vincular à Empresa</label>
              <select 
                required
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="">Selecione uma empresa...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Título</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              placeholder="Ex: Reunião de briefing"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Descrição</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors min-h-[100px]"
              placeholder="Detalhes da tarefa..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Responsável</label>
              <input
                type="text"
                value={formData.responsible}
                onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                placeholder="Nome"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Prioridade</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dia da Semana</label>
              <select
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Prazo Final</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cliente</label>
              <select
                value={formData.clientId}
                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="">Nenhum</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Projeto</label>
              <select
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="">Nenhum</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Lead</label>
              <select
                value={formData.leadId}
                onChange={e => setFormData({ ...formData, leadId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="">Nenhum</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Tarefa'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TaskColumn({ id, title, tasks, onEdit, onDelete, onStatusToggle, onQuickAdd }: any) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div className="flex-shrink-0 w-80">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-900 dark:text-white">{title}</h4>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button 
          onClick={onQuickAdd}
          className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-all"
          title="Adicionar tarefa rápida"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div 
        ref={setNodeRef}
        className="bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl p-3 min-h-[500px] border border-dashed border-slate-200 dark:border-slate-800 space-y-3 transition-colors"
      >
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task: any) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onEdit={onEdit} 
              onDelete={onDelete}
              onStatusToggle={onStatusToggle}
            />
          ))}
        </SortableContext>
        
        <button
          onClick={onQuickAdd}
          className="w-full py-3 flex items-center justify-center gap-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white dark:hover:bg-slate-900/50 rounded-xl border border-dashed border-transparent hover:border-violet-200 dark:hover:border-violet-900/30 transition-all text-xs font-medium group"
        >
          <Plus className="w-3 h-3 group-hover:scale-110 transition-transform" />
          Adicionar tarefa
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusToggle, isOverlay }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityColors: Record<string, string> = {
    alta: 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30',
    média: 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30',
    baixa: 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
  };

  const today = new Date().toISOString().split('T')[0];
  const isDelayed = task.status !== 'concluído' && task.deadline && task.deadline < today;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative",
        isOverlay && "shadow-xl border-violet-200 dark:border-violet-800 ring-2 ring-violet-500/20",
        isDelayed && "border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-900/5"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant="default" 
            className={cn("text-[10px] uppercase tracking-wider font-bold", priorityColors[task.priority])}
          >
            {task.priority}
          </Badge>
          {task.status === 'concluído' && (
            <Badge variant="success" className="text-[10px] uppercase tracking-wider font-bold">
              Concluído
            </Badge>
          )}
          {isDelayed && (
            <Badge variant="danger" className="text-[10px] uppercase tracking-wider font-bold animate-pulse">
              Atrasado
            </Badge>
          )}
        </div>
        {!isOverlay && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onEdit(task)}
              className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/50 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <h5 className={cn(
          "text-sm font-bold text-slate-900 dark:text-white mb-1",
          task.status === 'concluído' && "line-through text-slate-400 dark:text-slate-500"
        )}>
          {task.title}
        </h5>
        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        <div className="space-y-2">
          {task.responsible && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <User className="w-3 h-3" />
              <span className="font-medium">{task.responsible}</span>
            </div>
          )}
          {task.deadline && (
            <div className={cn(
              "flex items-center gap-2 text-[10px]",
              isDelayed ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500 dark:text-slate-400"
            )}>
              <Clock className="w-3 h-3" />
              <span>Prazo: {new Date(task.deadline).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex -space-x-1">
            {task.clientId && <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-white dark:border-slate-900" title="Cliente"><Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" /></div>}
            {task.projectId && <div className="p-1 bg-violet-50 dark:bg-violet-900/20 rounded-full border border-white dark:border-slate-900" title="Projeto"><Briefcase className="w-3 h-3 text-violet-600 dark:text-violet-400" /></div>}
            {task.leadId && <div className="p-1 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-white dark:border-slate-900" title="Lead"><Target className="w-3 h-3 text-amber-600 dark:text-amber-400" /></div>}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusToggle(task);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              task.status === 'concluído' 
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
