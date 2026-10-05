import React, { useState, useMemo } from 'react';
import { TeamMember, Task } from '../types';
import { addTeamMember, updateTeamMember, updateTask } from '../services/db';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { 
  getTaskDueDate, 
  getTaskTemporalStatus, 
  isTaskCompleted, 
  formatTaskDueDisplay 
} from '../lib/taskHelpers';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ListTodo, 
  Briefcase, 
  Mail, 
  Phone, 
  FileText, 
  CheckSquare, 
  Square,
  Power
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface TeamSectionProps {
  teamMembers: TeamMember[];
  tasks: Task[];
  companyId: string;
  onNavigateToTasks?: (memberId: string) => void;
}

const COMMON_ROLES = [
  'Gestor de Tráfego',
  'Social Media',
  'Designer',
  'Copywriter',
  'Desenvolvedor',
  'Web Designer',
  'SEO',
  'Automação',
  'Financeiro',
  'Comercial',
  'Atendimento',
  'Gestor de Projetos',
  'Diretor',
  'Outro'
];

export function TeamSection({
  teamMembers = [],
  tasks = [],
  companyId,
  onNavigateToTasks
}: TeamSectionProps) {
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingTasksMember, setViewingTasksMember] = useState<TeamMember | null>(null);
  const [memberTasksTab, setMemberTasksTab] = useState<'all' | 'today' | 'overdue' | 'upcoming' | 'completed'>('all');
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: COMMON_ROLES[0],
    customRole: '',
    phone: '',
    notes: '',
    active: true
  });

  // Calculate workloads per member in-memory
  const memberStats = useMemo(() => {
    const statsMap = new Map<string, {
      openTasks: number;
      overdueTasks: number;
      todayTasks: number;
      completedTasks: number;
      totalTasks: number;
    }>();

    teamMembers.forEach(m => {
      statsMap.set(m.id, {
        openTasks: 0,
        overdueTasks: 0,
        todayTasks: 0,
        completedTasks: 0,
        totalTasks: 0
      });
    });

    tasks.forEach(task => {
      if (!task.assigneeId) return;
      const stats = statsMap.get(task.assigneeId);
      if (!stats) return;

      stats.totalTasks++;
      if (isTaskCompleted(task)) {
        stats.completedTasks++;
      } else {
        stats.openTasks++;
        const temp = getTaskTemporalStatus(task);
        if (temp === 'overdue') stats.overdueTasks++;
        if (temp === 'today') stats.todayTasks++;
      }
    });

    return statsMap;
  }, [teamMembers, tasks]);

  // Global team KPI metrics
  const globalMetrics = useMemo(() => {
    const totalMembers = teamMembers.length;
    const activeMembers = teamMembers.filter(m => m.active).length;
    const inactiveMembers = totalMembers - activeMembers;

    let assignedOpenTasks = 0;
    let assignedOverdueTasks = 0;

    tasks.forEach(t => {
      if (t.assigneeId && !isTaskCompleted(t)) {
        assignedOpenTasks++;
        if (getTaskTemporalStatus(t) === 'overdue') {
          assignedOverdueTasks++;
        }
      }
    });

    return { totalMembers, activeMembers, inactiveMembers, assignedOpenTasks, assignedOverdueTasks };
  }, [teamMembers, tasks]);

  // Distinct roles for filter
  const distinctRoles = useMemo(() => {
    const set = new Set<string>();
    teamMembers.forEach(m => {
      if (m.role?.trim()) set.add(m.role.trim());
    });
    return Array.from(set).sort();
  }, [teamMembers]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m => {
      if (statusFilter === 'active' && !m.active) return false;
      if (statusFilter === 'inactive' && m.active) return false;

      if (roleFilter !== 'all' && m.role?.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = (m.name || '').toLowerCase().includes(query);
        const emailMatch = (m.email || '').toLowerCase().includes(query);
        const roleMatch = (m.role || '').toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !roleMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Active first, then by name
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [teamMembers, statusFilter, roleFilter, searchQuery]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      email: '',
      role: COMMON_ROLES[0],
      customRole: '',
      phone: '',
      notes: '',
      active: true
    });
    setIsMemberModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    const isCustom = !COMMON_ROLES.includes(member.role);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      role: isCustom ? 'Outro' : member.role,
      customRole: isCustom ? member.role : '',
      phone: member.phone || '',
      notes: member.notes || '',
      active: member.active ?? true
    });
    setIsMemberModalOpen(true);
  };

  // Toggle active/inactive
  const handleToggleActive = async (member: TeamMember) => {
    const newActive = !member.active;
    try {
      await updateTeamMember(member.id, {
        active: newActive
      });
    } catch (err) {
      console.error('Erro ao alternar status do membro:', err);
    }
  };

  // Submit form
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nome é obrigatório.');
      return;
    }

    const finalRole = formData.role === 'Outro' 
      ? (formData.customRole.trim() || 'Outro') 
      : formData.role;

    if (!finalRole.trim()) {
      alert('Função é obrigatória.');
      return;
    }

    setLoading(true);
    try {
      if (editingMember) {
        await updateTeamMember(editingMember.id, {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          role: finalRole,
          phone: formData.phone.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          active: formData.active
        });
      } else {
        await addTeamMember({
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          role: finalRole,
          phone: formData.phone.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          active: formData.active,
          companyId
        }, companyId);
      }
      setIsMemberModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      console.error('Erro ao salvar membro da equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tasks for the viewing modal
  const viewingMemberTasks = useMemo(() => {
    if (!viewingTasksMember) return [];
    return tasks.filter(t => t.assigneeId === viewingTasksMember.id);
  }, [tasks, viewingTasksMember]);

  const filteredViewingTasks = useMemo(() => {
    return viewingMemberTasks.filter(t => {
      const completed = isTaskCompleted(t);
      const temp = getTaskTemporalStatus(t);

      if (memberTasksTab === 'today') return !completed && temp === 'today';
      if (memberTasksTab === 'overdue') return !completed && temp === 'overdue';
      if (memberTasksTab === 'upcoming') return !completed && temp === 'upcoming';
      if (memberTasksTab === 'completed') return completed;
      return true;
    });
  }, [viewingMemberTasks, memberTasksTab]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-violet-900/10 via-slate-900/5 to-transparent dark:from-violet-950/40 dark:via-slate-900/20 p-5 rounded-2xl border border-violet-100 dark:border-violet-900/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-600 text-white rounded-lg shadow-md shadow-violet-600/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Equipe
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  ApexFlow OS
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie os responsáveis pela operação da ApexFlow.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-violet-900/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Adicionar membro</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Membros</span>
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{globalMetrics.totalMembers}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Cadastrados na empresa</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Ativos</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{globalMetrics.activeMembers}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Disponíveis para tarefas</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inativos</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-500">{globalMetrics.inactiveMembers}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Histórico preservado</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Tarefas Abertas</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{globalMetrics.assignedOpenTasks}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Em mãos da equipe</p>
        </div>

        <div className={cn(
          "p-4 rounded-xl border shadow-sm",
          globalMetrics.assignedOverdueTasks > 0 
            ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50" 
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Atrasadas</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className={cn(
            "text-2xl font-black",
            globalMetrics.assignedOverdueTasks > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
          )}>
            {globalMetrics.assignedOverdueTasks}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Demandam atenção</p>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick status tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                statusFilter === 'all'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Todos ({teamMembers.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5",
                statusFilter === 'active'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Ativos ({globalMetrics.activeMembers})</span>
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5",
                statusFilter === 'inactive'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Inativos ({globalMetrics.inactiveMembers})</span>
            </button>
          </div>

          <div className="flex flex-1 sm:justify-end items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por nome, e-mail ou função..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Role dropdown */}
            {distinctRoles.length > 0 && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="all">Todas as Funções</option>
                {distinctRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* TEAM MEMBERS GRID */}
      {filteredMembers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Nenhum membro encontrado</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {teamMembers.length === 0 
              ? "Comece cadastrando os profissionais responsáveis pela execução operacional da agência."
              : "Nenhum membro corresponde aos filtros de busca selecionados."}
          </p>
          {teamMembers.length === 0 && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Primeiro Membro</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map(member => {
            const stats = memberStats.get(member.id) || {
              openTasks: 0,
              overdueTasks: 0,
              todayTasks: 0,
              completedTasks: 0,
              totalTasks: 0
            };

            const initials = member.name
              .split(' ')
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={member.id}
                className={cn(
                  "bg-white dark:bg-slate-900 rounded-2xl border p-5 space-y-4 shadow-sm transition-all hover:shadow hover:border-slate-300 dark:hover:border-slate-700 relative overflow-hidden flex flex-col justify-between",
                  !member.active ? "opacity-70 bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/80" : "border-slate-200 dark:border-slate-800"
                )}
              >
                <div>
                  {/* Top: Avatar, Name, Role, Status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm",
                        member.active 
                          ? "bg-violet-600 text-white shadow-violet-600/20" 
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      )}>
                        {initials || <Users className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {member.name}
                        </h4>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{member.role}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border",
                      member.active 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", member.active ? "bg-emerald-500" : "bg-slate-400")} />
                      <span>{member.active ? 'Ativo' : 'Inativo'}</span>
                    </span>
                  </div>

                  {/* Contact Info (if available) */}
                  {(member.email || member.phone) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {member.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Workload Stats Card */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Abertas</span>
                      <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">{stats.openTasks}</span>
                    </div>

                    <div className={stats.overdueTasks > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : ""}>
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider block",
                        stats.overdueTasks > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-400"
                      )}>
                        Atrasadas
                      </span>
                      <span className={cn(
                        "text-base font-black mt-0.5 block",
                        stats.overdueTasks > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                      )}>
                        {stats.overdueTasks}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">Hoje</span>
                      <span className="text-base font-black text-violet-600 dark:text-violet-400 mt-0.5 block">{stats.todayTasks}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setViewingTasksMember(member);
                      setMemberTasksTab('all');
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors text-center flex items-center justify-center gap-1.5"
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>Ver tarefas ({stats.totalTasks})</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Editar membro"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(member)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      member.active 
                        ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" 
                        : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    )}
                    title={member.active ? "Desativar membro" : "Ativar membro"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR MEMBRO */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setEditingMember(null);
        }}
        title={editingMember ? "Editar Membro da Equipe" : "Adicionar Membro da Equipe"}
      >
        <form onSubmit={handleSaveMember} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Maria Silva, Carlos Santos"
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Função / Cargo *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {COMMON_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {formData.role === 'Outro' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Especifique a Função *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customRole}
                  onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                  placeholder="Ex: Analista de BI, Videomaker"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status Operacional
              </label>
              <select
                value={formData.active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="true">Ativo (recebe novas tarefas)</option>
                <option value="false">Inativo (somente histórico)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="colaborador@apexflow.com"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Especialidades, horários, alocação de projetos..."
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsMemberModalOpen(false);
                setEditingMember(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-md shadow-violet-900/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : editingMember ? 'Salvar Alterações' : 'Cadastrar Membro'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VER TAREFAS DO MEMBRO */}
      <Modal
        isOpen={Boolean(viewingTasksMember)}
        onClose={() => setViewingTasksMember(null)}
        title={viewingTasksMember ? `Tarefas de ${viewingTasksMember.name} (${viewingTasksMember.role})` : 'Tarefas da Equipe'}
      >
        <div className="space-y-4">
          {/* Subtabs within modal */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs overflow-x-auto">
            <button
              onClick={() => setMemberTasksTab('all')}
              className={cn(
                "px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap",
                memberTasksTab === 'all'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Todas ({viewingMemberTasks.length})
            </button>
            <button
              onClick={() => setMemberTasksTab('today')}
              className={cn(
                "px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap",
                memberTasksTab === 'today'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Hoje
            </button>
            <button
              onClick={() => setMemberTasksTab('overdue')}
              className={cn(
                "px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap",
                memberTasksTab === 'overdue'
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Atrasadas
            </button>
            <button
              onClick={() => setMemberTasksTab('upcoming')}
              className={cn(
                "px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap",
                memberTasksTab === 'upcoming'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Próximas
            </button>
            <button
              onClick={() => setMemberTasksTab('completed')}
              className={cn(
                "px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap",
                memberTasksTab === 'completed'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Concluídas
            </button>
          </div>

          {/* Task list */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredViewingTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhuma tarefa correspondente a este filtro.
              </div>
            ) : (
              filteredViewingTasks.map(task => {
                const completed = isTaskCompleted(task);
                const dueInfo = formatTaskDueDisplay(task);

                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <button
                        onClick={async () => {
                          const newStatus = completed ? 'a fazer' : 'concluído';
                          await updateTask(task.id, { status: newStatus });
                        }}
                        className="mt-0.5 text-slate-400 hover:text-emerald-500 shrink-0"
                      >
                        {completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <h5 className={cn(
                          "text-xs font-bold text-slate-900 dark:text-white",
                          completed && "line-through text-slate-400 font-normal"
                        )}>
                          {task.title}
                        </h5>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          {task.serviceName && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 font-medium">
                              {task.serviceName}
                            </span>
                          )}
                          {task.responsibleRole && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              Papel: {task.responsibleRole}
                            </span>
                          )}
                          <span className={cn(
                            "font-bold",
                            dueInfo.isOverdue && !completed ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
                          )}>
                            {dueInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                      completed 
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    )}>
                      {task.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setViewingTasksMember(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
