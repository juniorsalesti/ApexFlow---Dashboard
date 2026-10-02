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
  CheckCircle2,
  Server,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface NavGroup {
  groupLabel: string;
  items: {
    id: string;
    label: string;
    icon: any;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: 'VISÃO GERAL',
    items: [
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    ]
  },
  {
    groupLabel: 'CLIENTES',
    items: [
      { id: 'clients', label: 'Clientes', icon: Users, badge: '360°' },
    ]
  },
  {
    groupLabel: 'OPERAÇÃO',
    items: [
      { id: 'operational', label: 'Operacional', icon: Briefcase },
      { id: 'onboarding', label: 'Onboarding', icon: UserCheck, badge: 'Novo' },
      { id: 'processes', label: 'Processos / SOPs', icon: FileSpreadsheet, badge: 'Novo' },
      { id: 'projects', label: 'Projetos', icon: Briefcase },
      { id: 'tasks', label: 'Tarefas', icon: CheckCircle2 },
    ]
  },
  {
    groupLabel: 'FINANCEIRO',
    items: [
      { id: 'financial', label: 'Financeiro', icon: DollarSign },
    ]
  },
  {
    groupLabel: 'COMERCIAL',
    items: [
      { id: 'commercial', label: 'Comercial', icon: Target },
      { id: 'crm', label: 'CRM', icon: LayoutDashboard },
    ]
  },
  {
    groupLabel: 'CRESCIMENTO',
    items: [
      { id: 'hosting', label: 'Hospedagem', icon: Server },
      { id: 'growth', label: 'Crescimento', icon: TrendingUp },
    ]
  }
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
        <div className="p-5 flex items-center justify-between border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-md shadow-violet-900/40">
              <img 
                src="https://i.ibb.co/Y788pF9M/Apex-Flow.png" 
                alt="ApexFlow Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                ApexFlow <span className="text-[10px] uppercase tracking-wider font-extrabold text-violet-400 bg-violet-950/80 px-1.5 py-0.5 rounded border border-violet-800/40">OS</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">Agency Operating System</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                {group.groupLabel}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 group text-left',
                        isActive 
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30' 
                          : 'hover:bg-slate-900 hover:text-white text-slate-400'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {item.badge && (
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase",
                            isActive 
                              ? "bg-violet-800 text-white" 
                              : item.badge === 'Novo' 
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" 
                                : "bg-violet-950/80 text-violet-400 border border-violet-800/40"
                          )}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-900 space-y-1 bg-slate-950">
          <p className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">
            SISTEMA
          </p>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-semibold",
              activeTab === 'settings' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            )}
          >
            <Settings className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Configurações</span>
          </button>
          <button 
            onClick={() => {
              // Sign out or other system actions
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 transition-colors text-xs font-semibold"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
