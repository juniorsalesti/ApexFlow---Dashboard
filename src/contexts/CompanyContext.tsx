import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company } from '../types';
import { subscribeCompanies } from '../services/db';

interface CompanyContextType {
  companies: Company[];
  selectedCompanyId: string | null; // null means "All Companies"
  setSelectedCompanyId: (id: string | null) => void;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeCompanies((data) => {
      setCompanies(data as Company[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <CompanyContext.Provider value={{ companies, selectedCompanyId, setSelectedCompanyId, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
