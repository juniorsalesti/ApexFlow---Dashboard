import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  Briefcase, 
  Target, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  PieChart as PieChartIcon,
  BarChart3,
  Plus,
  DollarSign,
  Calendar,
  Building2
} from 'lucide-react';
import { Card } from './ui/Card';
import { StatCard } from './ui/StatCard';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { formatCurrency, formatPercent } from '../lib/utils';
import { addProject, addTask } from '../services/db';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const PROJECT_TYPE_COLORS: Record<string, string> = {
  'Site': '#8b5cf6',
  'Landing Page': '#a78bfa',
  'Branding': '#c4b5fd',
  'Automação': '#ddd6fe',
};

interface ProjectsSectionProps {
  projects: any[];
  financial: any[];
}

export function ProjectsSection({ projects, financial }: ProjectsSectionProps) {
  const { selectedCompanyId, companies } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    type: 'Site',
    value: 0,
    status: 'negotiation',
    deadline: '',
    companyId: ''
  });

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const companyId = selectedCompanyId || formData.companyId;
    if (!companyId) {
      alert('Por favor, selecione uma empresa para vincular este projeto.');
      return;
    }
    setLoading(true);
    try {
      const projectRes = await addProject({
        ...formData,
        value: Number(formData.value)
      }, companyId);

      if (projectRes) {
        // Automation: Generate standard checklist tasks
        const standardTasks = [
          { title: `Briefing: ${formData.name}`, description: 'Reunião inicial e coleta de materiais', date: 'Segunda-feira', priority: 'alta' },
          { title: `Planejamento: ${formData.name}`, description: 'Definição de cronograma e escopo detalhado', date: 'Terça-feira', priority: 'média' },
          { title: `Execução: ${formData.name}`, description: 'Início do desenvolvimento/criação', date: 'Quarta-feira', priority: 'alta' },
          { title: `Revisão Interna: ${formData.name}`, description: 'Check de qualidade e ajustes', date: 'Quinta-feira', priority: 'média' },
          { title: `Entrega/Aprovação: ${formData.name}`, description: 'Apresentação para o cliente', date: 'Sexta-feira', priority: 'alta' },
        ];

        for (const task of standardTasks) {
          await addTask({
            ...task,
            status: 'a fazer',
            projectId: projectRes.id,
            clientId: formData.clientId,
            responsible: 'Equipe'
          }, companyId);
        }
      }

      setIsModalOpen(false);
      setFormData({ name: '', clientId: '', type: 'Site', value: 0, status: 'negotiation', deadline: '', companyId: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const projectRevenue = projects
    .filter(p => p.status === 'delivered')
    .reduce((acc, curr) => acc + (curr.value || 0), 0);

  const projectCount = projects.length;
  const avgProjectTicket = projectCount > 0 ? projectRevenue / projects.filter(p => p.status === 'delivered').length || 0 : 0;
  const projectsInProgress = projects.filter(p => p.status === 'execution').length;
  const projectsDelayed = projects.filter(p => p.status === 'delayed').length;

  const projectTypeCounts = projects.reduce((acc: any, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {});

  const projectTypeData = Object.entries(projectTypeCounts).map(([name, value]) => ({
    name,
    value,
    color: PROJECT_TYPE_COLORS[name] || '#cbd5e1'
  }));

  const pipelineStages = [
    { id: 'negotiation', label: 'Em Negociação', icon: Target, color: 'bg-slate-100 text-slate-600' },
    { id: 'execution', label: 'Em Execução', icon: Zap, color: 'bg-violet-100 text-violet-600' },
    { id: 'delivered', label: 'Entregue', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
    { id: 'delayed', label: 'Atrasado', icon: AlertCircle, color: 'bg-rose-100 text-rose-600' },
  ];

  // Process data for chart
  const chartData = [
    { month: 'Jan', projectRevenue: 0 },
    { month: 'Fev', projectRevenue: 0 },
    { month: 'Mar', projectRevenue: 0 },
    { month: 'Abr', projectRevenue: projectRevenue },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Projetos (One-Time)</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard 
          title="Receita de Projetos" 
          value={projectRevenue} 
          icon={Briefcase} 
          isCurrency 
          className="lg:col-span-2"
        />
        <StatCard 
          title="Total de Projetos" 
          value={projectCount} 
          icon={CheckCircle2} 
          trend={20}
        />
        <StatCard 
          title="Ticket Médio" 
          value={avgProjectTicket} 
          icon={TrendingUp} 
          isCurrency 
        />
        <StatCard 
          title="Em Andamento" 
          value={projectsInProgress} 
          icon={Clock} 
        />
        <StatCard 
          title="Atrasados" 
          value={projectsDelayed} 
          icon={AlertCircle} 
          className={projectsDelayed > 0 ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-900/10' : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card title="Receita de Projetos" subtitle="Evolução mensal (One-Time)" className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip 
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="projectRevenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Type Distribution */}
        <Card title="Distribuição por Tipo" subtitle="Volume de projetos por categoria">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {projectTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {projectTypeData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline Visual */}
      <Card title="Pipeline de Projetos" subtitle="Fluxo de execução e negociação">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {pipelineStages.map((stage) => (
            <div key={stage.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="flex items-center gap-2">
                  <stage.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{stage.label}</span>
                </div>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  {projects.filter(p => p.status === stage.id).length}
                </span>
              </div>
              
              <div className="space-y-3">
                {projects.filter(p => p.status === stage.id).map(project => (
                  <div key={project.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-violet-300 dark:hover:border-violet-700 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{project.name}</h5>
                      <Badge variant={project.status === 'delayed' ? 'risk' : 'default'}>{project.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(project.value)}</span>
                    </div>
                  </div>
                ))}
                {projects.filter(p => p.status === stage.id).length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-300 dark:text-slate-700 font-medium">Nenhum projeto</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Novo Projeto"
      >
        <form onSubmit={handleAddProject} className="space-y-4">
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

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Nome do Projeto</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
                placeholder="Ex: Novo Site Institucional"
                required
              />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="Site">Site</option>
                <option value="Landing Page">Landing Page</option>
                <option value="Branding">Branding</option>
                <option value="Automação">Automação</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              >
                <option value="negotiation">Negociação</option>
                <option value="execution">Execução</option>
                <option value="delivered">Entregue</option>
                <option value="delayed">Atrasado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Prazo</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="date" 
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500 transition-colors text-sm dark:text-white"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar Projeto'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
