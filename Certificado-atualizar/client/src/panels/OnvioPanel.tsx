import { useEffect, useCallback, useState } from 'react';
import { useAutomacaoForms } from '../context/AutomacaoFormsContext';
import { useSiegData } from '../context/SiegDataContext';
import { useFillFromSieg } from '../hooks/useFillFromSieg';
import { fetchDefaultsOnvio } from '../api/defaults';
import { parseRespostaComoJson, onlyDigits, getMessageFromResponse } from '../api/client';
import type { ApiResponse } from '../types/api';
import ResultMessage from '../components/ResultMessage';
import LoadingButton from '../components/LoadingButton';
import CertificadoFormFields from '../components/CertificadoFormFields';

export default function OnvioPanel() {
  const { onvio, setOnvio } = useAutomacaoForms();
  const { fillOnvioFromSieg } = useSiegData();
  const { fillFromSieg, fileInputRef } = useFillFromSieg(fillOnvioFromSieg, setOnvio);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchDefaultsOnvio().then((d) => {
      if (d.email) setOnvio({ email: d.email });
      if (d.senha) setOnvio({ senha: d.senha });
      if (d.cnpj) setOnvio({ cnpj: d.cnpj });
    });
  }, [setOnvio]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onvio.email.trim() || !onvio.senha.trim()) {
        setResult({ success: false, message: 'E-mail e senha ONVIO são obrigatórios.' });
        return;
      }
      const cnpjDigits = onlyDigits(onvio.cnpj);
      if (cnpjDigits.length !== 14) {
        setResult({ success: false, message: 'CNPJ deve ter 14 dígitos.' });
        return;
      }
      if (!onvio.certificadoFile) {
        setResult({ success: false, message: 'Selecione o arquivo do certificado (.pfx).' });
        return;
      }
      if (!onvio.senhaCertificado.trim()) {
        setResult({ success: false, message: 'Informe a senha do certificado (.pfx).' });
        return;
      }
      setLoading(true);
      setResult(null);
      try {
        const formData = new FormData();
        formData.append('email', onvio.email.trim());
        formData.append('senha', onvio.senha.trim());
        formData.append('cnpj', cnpjDigits);
        formData.append('certificado', onvio.certificadoFile);
        formData.append('senhaCertificado', onvio.senhaCertificado.trim());
        const res = await fetch('/api/onvio/executar', { method: 'POST', body: formData });
        const texto = await res.text();
        const data = parseRespostaComoJson<ApiResponse>(res, texto);
        setResult({ success: data.success === true, message: getMessageFromResponse(data) });
      } catch (err) {
        setResult({ success: false, message: err instanceof Error ? err.message : 'Erro de conexão.' });
      } finally {
        setLoading(false);
      }
    },
    [onvio]
  );

  return (
    <>
      <h2>ONVIO – Manifestação NF-e</h2>
      <p className="hint">
        Automação: login no ONVIO, abertura do fluxo de certificado. O navegador será aberto durante a execução.
      </p>
      <p className="hint">
        <button type="button" className="btn-link" onClick={fillFromSieg}>
          Usar dados do SIEG
        </button>{' '}
        para preencher certificado/CNPJ/senha.
      </p>
      <form id="form-onvio" onSubmit={handleSubmit}>
        <CertificadoFormFields
          state={onvio}
          onChange={(u) => setOnvio(u)}
          fileInputRef={fileInputRef}
          prefix="onvio"
          cnpjLabel="CNPJ (14 dígitos)"
          cnpjRequired
          certificadoRequired
          senhaCertificadoRequired
        />
        <LoadingButton loading={loading} loadingText="Executando…">
          Executar automação
        </LoadingButton>
      </form>
      <ResultMessage visible={!!result} success={result?.success ?? false} message={result?.message ?? ''} />
    </>
  );
}
