export interface MonthlyData {
  month: string;
  revenue: number;
  mrr: number;
  projectRevenue: number;
  clients: number;
  leads: number;
  proposals: number;
  sales: number;
}

export interface ServiceRevenue {
  name: string;
  value: number;
  color: string;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  companyId: string;
  revenue?: number;
  status: 'active' | 'inactive' | 'healthy' | 'attention' | 'risk';
  service?: string;
  category?: 'agency' | 'hosting';
  type?: 'recurrent' | 'project' | 'both';
  ltv?: number;
  cac?: number;
  joinedAt: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  companyId: string;
  clientId?: string;
  clientName: string;
  value: number;
  type: 'Site' | 'Landing Page' | 'Branding' | 'Automação';
  status: 'negotiation' | 'execution' | 'delivered' | 'delayed';
  startDate: string;
  deliveryDate?: string;
  probability?: number; // for negotiation
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'a fazer' | 'em andamento' | 'concluído' | 'todo' | 'in-progress' | 'review' | 'done' | 'pending' | 'completed' | string;
  priority?: 'baixa' | 'média' | 'alta' | 'urgente' | 'low' | 'medium' | 'high' | 'urgent' | string;
  companyId: string;
  userId: string;
  clientId?: string;
  projectId?: string;
  leadId?: string;
  serviceId?: string;
  serviceName?: string;
  processId?: string;
  processTitle?: string;
  processStepId?: string;
  processStepOrder?: number;
  processStepTitle?: string;
  source?: 'manual' | 'project' | 'process' | string;
  responsible?: string;
  responsibleRole?: string;
  assigneeId?: string;
  date?: string;
  deadline?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskGenerationResult {
  created: number;
  skipped: number;
  duplicated: number;
  message?: string;
}

export interface BatchTaskGenerationResult {
  totalCreated: number;
  totalSkipped: number;
  results: {
    processId: string;
    processTitle: string;
    serviceName?: string;
    created: number;
    skipped: number;
  }[];
  message: string;
}

export interface DashboardStats {
  currentRevenue: number;
  mrr: number;
  projectRevenue: number;
  totalRevenue: number;
  activeClients: number;
  monthlyGrowth: number;
  averageTicket: number;
  ltv: number;
  cac: number;
  churnRate: number;
  conversionRate: number;
  onTimeDelivery: number;
  projectCount: number;
  avgProjectTicket: number;
  projectsInProgress: number;
  projectsDelivered: number;
  projectsDelayed: number;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  companyId: string;
  phone?: string;
  email?: string;
  source?: string;
  value: number;
  status: 'lead' | 'contact' | 'meeting' | 'proposal' | 'won' | 'lost';
  owner?: string;
  notes?: string;
  createdAt: string;
  userId: string;
}

export interface Company {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  clientId: string;
  companyId: string;
  monthlyValue: number;
  service: string;
  status: 'active' | 'paused' | 'canceled';
  startDate: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  payments?: { [key: string]: boolean }; // e.g {"2024-04": true}
}

export interface ProcessStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  checklist?: string[];
  estimatedMinutes?: number;
  responsibleRole?: string;
  required: boolean;
  active?: boolean;
}

export interface Process {
  id: string;
  title: string;
  description?: string;
  category: string;
  department?: string;
  serviceId?: string;
  serviceName?: string;
  content?: string;
  steps: ProcessStep[];
  active?: boolean;
  companyId: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  completed: boolean;
  completedAt?: string;
  assignedTo?: string;
}

export interface Onboarding {
  id: string;
  clientId: string;
  companyId: string;
  userId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  currentStep: number;
  steps: OnboardingStep[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category?: string;
  active: boolean;
  companyId: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ClientService {
  id: string;
  clientId: string;
  serviceId: string;
  companyId: string;
  userId: string;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  active: boolean;
  companyId: string;
  userId: string;
  avatarUrl?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

