import { useCallback, useRef } from 'react';
import type { SiegData } from '../context/SiegDataContext';
import type { CertificadoFormState } from '../types/api';

type SetFormFn = (update: Partial<CertificadoFormState> | ((prev: CertificadoFormState) => Partial<CertificadoFormState>)) => void;

/**
 * Preenche o formulário com os dados do painel SIEG e atualiza o input de arquivo via DataTransfer.
 */
export function useFillFromSieg(getSiegData: () => SiegData, setForm: SetFormFn) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fillFromSieg = useCallback(() => {
    const data = getSiegData();
    if (data.cnpj && data.cnpj.length === 14) setForm({ cnpj: data.cnpj });
    if (data.senhaCertificado) setForm({ senhaCertificado: data.senhaCertificado });
    if (data.file) {
      setForm({ certificadoFile: data.file });
      if (fileInputRef.current && typeof DataTransfer !== 'undefined') {
        try {
          const dt = new DataTransfer();
          dt.items.add(data.file);
          fileInputRef.current.files = dt.files;
        } catch {
          // DataTransfer não suportado
        }
      }
    }
  }, [getSiegData, setForm]);

  return { fillFromSieg, fileInputRef };
}
