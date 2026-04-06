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
  companyId: string;
  revenue: number;
  status: 'healthy' | 'attention' | 'risk';
  service: string;
  ltv: number;
  cac: number;
  joinedAt: string;
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
