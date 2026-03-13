import { useEffect, useCallback, useState } from 'react';
import { useAutomacaoForms } from '../context/AutomacaoFormsContext';
import { useSiegData } from '../context/SiegDataContext';
import { useFillFromSieg } from '../hooks/useFillFromSieg';
import { fetchDefaultsUnecont } from '../api/defaults';
import { parseRespostaComoJson, onlyDigits, getMessageFromResponse } from '../api/client';
import type { ApiResponse } from '../types/api';
import ResultMessage from '../components/ResultMessage';
import LoadingButton from '../components/LoadingButton';
import CertificadoFormFields from '../components/CertificadoFormFields';

export default function UnecontPanel() {
  const { unecont, setUnecont } = useAutomacaoForms();
  const { fillUnecontFromSieg } = useSiegData();
  const { fillFromSieg, fileInputRef } = useFillFromSieg(fillUnecontFromSieg, setUnecont);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchDefaultsUnecont().then((d) => {
      if (d.email) setUnecont({ email: d.email });
      if (d.senha) setUnecont({ senha: d.senha });
    });
  }, [setUnecont]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!unecont.email.trim() || !unecont.senha.trim()) {
        setResult({ success: false, message: 'E-mail e senha são obrigatórios.' });
        return;
      }
      setLoading(true);
      setResult(null);
      try {
        const cnpjDigits = onlyDigits(unecont.cnpj);
        const hasCert = cnpjDigits.length === 14 && unecont.certificadoFile && unecont.senhaCertificado.trim();

        if (hasCert) {
          const file = unecont.certificadoFile!;
          const formData = new FormData();
          formData.append('email', unecont.email.trim());
          formData.append('senha', unecont.senha.trim());
          formData.append('cnpj', cnpjDigits);
          formData.append('certificado', file);
          formData.append('senhaCertificado', unecont.senhaCertificado.trim());
          const res = await fetch('/api/unecont/executar', { method: 'POST', body: formData });
          const texto = await res.text();
          const data = parseRespostaComoJson<ApiResponse>(res, texto);
          setResult({ success: data.success === true, message: getMessageFromResponse(data) });
        } else {
          const res = await fetch('/api/unecont/executar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: unecont.email.trim(), senha: unecont.senha.trim() }),
          });
          const texto = await res.text();
          const data = parseRespostaComoJson<ApiResponse>(res, texto);
          setResult({ success: data.success === true, message: getMessageFromResponse(data) });
        }
      } catch (err) {
        setResult({ success: false, message: err instanceof Error ? err.message : 'Erro de conexão.' });
      } finally {
        setLoading(false);
      }
    },
    [unecont]
  );

  return (
    <>
      <h2>Acessar ou atualizar certificado UNECONT</h2>
      <p className="hint">
        Preencha e-mail e senha. Para atualizar o certificado na UNECONT, preencha também CNPJ, arquivo .pfx e senha
        do certificado.
      </p>
      <p className="hint">
        <button type="button" className="btn-link" onClick={fillFromSieg}>
          Usar dados do SIEG
        </button>{' '}
        para preencher certificado/CNPJ/senha.
      </p>
      <form id="form-unecont" onSubmit={handleSubmit}>
        <CertificadoFormFields
          state={unecont}
          onChange={(u) => setUnecont(u)}
          fileInputRef={fileInputRef}
          prefix="unecont"
          cnpjLabel="CNPJ (para atualizar certificado)"
          cnpjRequired={false}
          certificadoRequired={false}
          senhaCertificadoRequired={false}
        />
        <LoadingButton loading={loading} loadingText="Executando…">
          Executar automação
        </LoadingButton>
      </form>
      <ResultMessage visible={!!result} success={result?.success ?? false} message={result?.message ?? ''} />
    </>
  );
}
