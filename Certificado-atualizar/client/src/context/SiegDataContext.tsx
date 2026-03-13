import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface SiegData {
  cnpj: string;
  senhaCertificado: string;
  file: File | null;
}

interface SiegDataContextValue {
  siegData: SiegData;
  setSiegData: (data: Partial<SiegData> | ((prev: SiegData) => Partial<SiegData>)) => void;
  fillUnecontFromSieg: () => SiegData;
  fillOnvioFromSieg: () => SiegData;
}

const initial: SiegData = {
  cnpj: '',
  senhaCertificado: '',
  file: null,
};

const SiegDataContext = createContext<SiegDataContextValue | null>(null);

export function SiegDataProvider({ children }: { children: ReactNode }) {
  const [siegData, setSiegDataState] = useState<SiegData>(initial);

  const setSiegData = useCallback((update: Partial<SiegData> | ((prev: SiegData) => Partial<SiegData>)) => {
    setSiegDataState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return { ...prev, ...next };
    });
  }, []);

  const fillUnecontFromSieg = useCallback(() => siegData, [siegData]);
  const fillOnvioFromSieg = useCallback(() => siegData, [siegData]);

  const value: SiegDataContextValue = {
    siegData,
    setSiegData,
    fillUnecontFromSieg,
    fillOnvioFromSieg,
  };

  return <SiegDataContext.Provider value={value}>{children}</SiegDataContext.Provider>;
}

export function useSiegData(): SiegDataContextValue {
  const ctx = useContext(SiegDataContext);
  if (!ctx) {
    throw new Error('useSiegData must be used within SiegDataProvider');
  }
  return ctx;
}
