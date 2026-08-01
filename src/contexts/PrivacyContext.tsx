import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
  hideValues: boolean;
  toggleHideValues: () => void;
  formatCurrency: (value: number) => string;
}

const PrivacyContext = createContext<PrivacyContextType>({
  hideValues: false,
  toggleHideValues: () => {},
  formatCurrency: (val: number) => '',
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hideValues, setHideValues] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('apex_hide_financial_values');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('apex_hide_financial_values', JSON.stringify(hideValues));
    } catch (e) {
      console.error(e);
    }
  }, [hideValues]);

  const toggleHideValues = () => {
    setHideValues(prev => !prev);
  };

  const formatCurrencyWithPrivacy = (value: number) => {
    if (hideValues) {
      return 'R$ ••••••';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <PrivacyContext.Provider value={{ hideValues, toggleHideValues, formatCurrency: formatCurrencyWithPrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
