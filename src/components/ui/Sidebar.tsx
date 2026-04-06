import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  Target, 
  Settings, 
  LogOut,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Visão Geral', id: 'overview' },
  { icon: DollarSign, label: 'Financeiro', id: 'financial' },
  { icon: Briefcase, label: 'Projetos', id: 'projects' },
  { icon: Users, label: 'Clientes', id: 'clients' },
  { icon: TrendingUp, label: 'Crescimento', id: 'growth' },
  { icon: Briefcase, label: 'Operacional', id: 'operational' },
  { icon: Target, label: 'Comercial', id: 'commercial' },
  { icon: LayoutDashboard, label: 'CRM', id: 'crm' },
  { icon: CheckCircle2, label: 'Tarefas', id: 'tasks' },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 dark:bg-slate-950 text-slate-300 flex flex-col h-screen border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:block",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="https://i.ibb.co/Y788pF9M/Apex-Flow.png" 
                alt="ApexFlow Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">ApexFlow</h1>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group',
              activeTab === item.id 
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20' 
                : 'hover:bg-slate-900 hover:text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn('w-5 h-5', activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {activeTab === item.id && <ChevronRight className="w-4 h-4" />}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-900 transition-colors">
          <Settings className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium">Configurações</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-rose-900/20 text-rose-400 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
    </>
  );
}
