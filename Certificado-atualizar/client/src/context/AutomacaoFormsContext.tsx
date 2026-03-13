import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CertificadoFormState } from '../types/api';

export type { CertificadoFormState };
export type UnecontFormState = CertificadoFormState;
export type OnvioFormState = CertificadoFormState;

const initialForm: CertificadoFormState = {
  email: '',
  senha: '',
  cnpj: '',
  certificadoFile: null,
  senhaCertificado: '',
};

interface AutomacaoFormsContextValue {
  unecont: CertificadoFormState;
  onvio: CertificadoFormState;
  setUnecont: (update: Partial<CertificadoFormState> | ((prev: CertificadoFormState) => Partial<CertificadoFormState>)) => void;
  setOnvio: (update: Partial<CertificadoFormState> | ((prev: CertificadoFormState) => Partial<CertificadoFormState>)) => void;
}

const AutomacaoFormsContext = createContext<AutomacaoFormsContextValue | null>(null);

export function AutomacaoFormsProvider({ children }: { children: ReactNode }) {
  const [unecont, setUnecontState] = useState<CertificadoFormState>(initialForm);
  const [onvio, setOnvioState] = useState<CertificadoFormState>(initialForm);

  const setUnecont = useCallback((update: Partial<CertificadoFormState> | ((prev: CertificadoFormState) => Partial<CertificadoFormState>)) => {
    setUnecontState((prev) => ({ ...prev, ...(typeof update === 'function' ? update(prev) : update) }));
  }, []);

  const setOnvio = useCallback((update: Partial<CertificadoFormState> | ((prev: CertificadoFormState) => Partial<CertificadoFormState>)) => {
    setOnvioState((prev) => ({ ...prev, ...(typeof update === 'function' ? update(prev) : update) }));
  }, []);

  return (
    <AutomacaoFormsContext.Provider value={{ unecont, onvio, setUnecont, setOnvio }}>
      {children}
    </AutomacaoFormsContext.Provider>
  );
}

export function useAutomacaoForms(): AutomacaoFormsContextValue {
  const ctx = useContext(AutomacaoFormsContext);
  if (!ctx) throw new Error('useAutomacaoForms must be used within AutomacaoFormsProvider');
  return ctx;
}
