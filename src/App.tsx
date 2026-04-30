import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { 
  subscribeClients, 
  subscribeProjects, 
  subscribeContracts, 
  subscribeFinancial,
  subscribeCommercial,
  subscribeLeads,
  subscribeTasks
} from './services/db';
import { Sidebar } from './components/ui/Sidebar';
import { Header } from './components/ui/Header';
import { OverviewSection } from './components/OverviewSection';
import { FinancialSection } from './components/FinancialSection';
import { ClientSection } from './components/ClientSection';
import { GrowthSection } from './components/GrowthSection';
import { OperationalSection } from './components/OperationalSection';
import { CommercialSection } from './components/CommercialSection';
import { ProjectsSection } from './components/ProjectsSection';
import { CRMSection } from './components/CRMSection';
import { TasksSection } from './components/TasksSection';
import { SettingsSection } from './components/SettingsSection';
import { Auth } from './components/Auth';
import { CompanyProvider, useCompany } from './contexts/CompanyContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Calendar, Filter, Download, ChevronDown, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './components/ui/Card';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(public props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) errorMessage = `Erro no Firestore: ${parsed.error} (${parsed.operationType} em ${parsed.path})`;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
          <Card className="max-w-md p-8 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Ops! Algo deu errado</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 dark:bg-violet-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 dark:hover:bg-violet-700 transition-colors"
            >
              Recarregar Página
            </button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        {user ? (
          <CompanyProvider>
            <DashboardContent />
          </CompanyProvider>
        ) : (
          <Auth />
        )}
      </ErrorBoundary>
    </ThemeProvider>
  );
}

function DashboardContent() {
  const { selectedCompanyId } = useCompany();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('Este Mês');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Real data state
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [financial, setFinancial] = useState<any[]>([]);
  const [commercial, setCommercial] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const unsubClients = subscribeClients(setClients, selectedCompanyId);
    const unsubProjects = subscribeProjects(setProjects, selectedCompanyId);
    const unsubContracts = subscribeContracts(setContracts, selectedCompanyId);
    const unsubFinancial = subscribeFinancial(setFinancial, selectedCompanyId);
    const unsubCommercial = subscribeCommercial(setCommercial, selectedCompanyId);
    const unsubLeads = subscribeLeads(setLeads, selectedCompanyId);
    const unsubTasks = subscribeTasks(setTasks, selectedCompanyId);

    return () => {
      unsubClients();
      unsubProjects();
      unsubContracts();
      unsubFinancial();
      unsubCommercial();
      unsubLeads();
      unsubTasks();
    };
  }, [selectedCompanyId]);

  const renderSection = () => {
    switch (activeTab) {
      case 'overview': return <OverviewSection clients={clients} projects={filteredProjects} contracts={filteredContracts} financial={filteredFinancial} allFinancial={financial} selectedMonth={selectedMonth} selectedYear={selectedYear} period={period} />;
      case 'financial': return <FinancialSection financial={filteredFinancial} allFinancial={financial} clients={clients} selectedMonth={selectedMonth} selectedYear={selectedYear} period={period} />;
      case 'clients': return <ClientSection clients={clients} projects={projects} contracts={contracts} financial={financial} />;
      case 'hosting': return <ClientSection clients={clients} projects={projects} contracts={contracts} financial={financial} initialTab="hosting" />;
      case 'growth': return <GrowthSection clients={clients} projects={projects} financial={filteredFinancial} allFinancial={financial} />;
      case 'operational': return <OperationalSection projects={filteredProjects} />;
      case 'commercial': return <CommercialSection commercial={commercial} />;
      case 'crm': return <CRMSection leads={filteredLeads} clients={clients} projects={projects} contracts={contracts} />;
      case 'projects': return <ProjectsSection projects={filteredProjects} financial={filteredFinancial} allFinancial={financial} />;
      case 'tasks': return <TasksSection tasks={tasks} clients={clients} projects={projects} leads={leads} />;
      case 'settings': return <SettingsSection />;
      default: return <OverviewSection clients={clients} projects={filteredProjects} contracts={filteredContracts} financial={filteredFinancial} allFinancial={financial} selectedMonth={selectedMonth} selectedYear={selectedYear} period={period} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Visão Geral';
      case 'financial': return 'Financeiro';
      case 'clients': return 'Gestão de Clientes';
      case 'hosting': return 'Gestão de Hospedagem';
      case 'growth': return 'Crescimento & Métricas';
      case 'operational': return 'Operacional & Projetos';
      case 'commercial': return 'Comercial & Vendas';
      case 'crm': return 'CRM / Pipeline de Vendas';
      case 'projects': return 'Projetos (One-Time)';
      case 'tasks': return 'Gestão de Tarefas';
      case 'settings': return 'Configurações';
      default: return 'Dashboard';
    }
  };

  const filteredFinancial = useMemo(() => {
    if (period === 'Personalizado') {
      return financial.filter(f => {
        const d = new Date(f.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }

    const now = new Date();
    let days = 30;
    if (period === 'Últimos 7 dias') days = 7;
    if (period === 'Últimos 90 dias') days = 90;
    if (period === 'Este Mês') {
      return financial.filter(f => {
        const d = new Date(f.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    
    const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return financial.filter(f => new Date(f.date) >= cutoff);
  }, [financial, period, selectedMonth, selectedYear]);

  const filteredContracts = useMemo(() => {
    // For MRR, we usually want active contracts in the selected period
    // If filtering by month, we show contracts that were active during that month
    return contracts.filter(c => c.status === 'active');
  }, [contracts]);

  const filteredProjects = useMemo(() => {
    if (period === 'Personalizado') {
      return projects.filter(p => {
        const d = new Date(p.startDate || p.createdAt);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }
    return projects;
  }, [projects, period, selectedMonth, selectedYear]);

  const filteredLeads = useMemo(() => {
    if (period === 'Personalizado') {
      return leads.filter(l => {
        const d = new Date(l.createdAt);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }
    return leads;
  }, [leads, period, selectedMonth, selectedYear]);

  const handleExport = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'];
    const rows = financial.map(f => [
      new Date(f.date).toLocaleDateString('pt-BR'),
      f.description || '',
      f.category,
      f.type === 'income' ? 'Receita' : 'Despesa',
      f.value.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          
          <main className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto w-full">
            {/* Page Header & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{getTitle()}</h2>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Bem-vindo de volta, aqui está o resumo da ApexFlow hoje.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {period === 'Personalizado' && (
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[10px] md:text-xs font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[10px] md:text-xs font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative group">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Calendar className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                    <span className="text-[10px] md:text-xs font-medium text-slate-600 dark:text-slate-300">{period}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {['Este Mês', 'Últimos 7 dias', 'Últimos 30 dias', 'Últimos 90 dias', 'Personalizado'].map(p => (
                      <button 
                        key={p}
                        onClick={() => setPeriod(p)}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Filter className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                  <span className="text-[10px] md:text-xs font-medium text-slate-600 dark:text-slate-300">Filtros</span>
                </button>

                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-violet-600 text-white rounded-lg px-4 py-2 shadow-sm hover:bg-slate-800 dark:hover:bg-violet-700 transition-colors ml-auto lg:ml-0"
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-[10px] md:text-xs font-medium">Exportar</span>
                </button>
              </div>
            </div>

            {/* Dynamic Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>

            {/* Footer Highlights (Only on Overview) */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                <div className="p-6 bg-violet-600 rounded-2xl text-white shadow-xl shadow-violet-200 dark:shadow-violet-900/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <TrendingUp className="w-32 h-32" />
                  </div>
                  <h4 className="text-lg font-bold mb-2">Destaque de Crescimento</h4>
                  <p className="text-violet-100 text-sm max-w-md leading-relaxed">
                    {financial.length > 0 ? (
                      <>Seu faturamento está sendo monitorado em tempo real. Adicione mais transações para ver insights detalhados.</>
                    ) : (
                      <>Nenhum dado financeiro registrado ainda. Comece adicionando sua primeira transação no módulo Financeiro.</>
                    )}
                  </p>
                </div>

                <div className="p-6 bg-slate-900 dark:bg-slate-800 rounded-2xl text-white shadow-xl shadow-slate-200 dark:shadow-slate-950/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Users className="w-32 h-32" />
                  </div>
                  <h4 className="text-lg font-bold mb-2">Gestão de Clientes</h4>
                  <p className="text-slate-400 dark:text-slate-300 text-sm max-w-md leading-relaxed">
                    {clients.length > 0 ? (
                      <>Você tem {clients.length} clientes registrados. Acompanhe a saúde e retenção de cada um no módulo de Clientes.</>
                    ) : (
                      <>Sua base de clientes está vazia. Adicione novos clientes para começar a gerenciar sua agência.</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
