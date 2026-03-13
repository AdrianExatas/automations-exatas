import { useState, useCallback } from 'react';
import { useSiegData } from '../context/SiegDataContext';
import { useAutomacaoForms } from '../context/AutomacaoFormsContext';
import { parseRespostaComoJson, onlyDigits, getMessageFromResponse, escapeHtml } from '../api/client';
import type { ApiResponse } from '../types/api';

export default function ExecutarTodas() {
  const { siegData, fillUnecontFromSieg, fillOnvioFromSieg } = useSiegData();
  const { unecont, onvio, setUnecont, setOnvio } = useAutomacaoForms();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    msgUnecont: string;
    msgOnvio: string;
    successUnecont: boolean;
    successOnvio: boolean;
  } | null>(null);

  const handleExecutarTodas = useCallback(async () => {
    // Apply SIEG data to form state (like original "preencher" before reading)
    const dataUnecont = fillUnecontFromSieg();
    const dataOnvio = fillOnvioFromSieg();
    if (dataUnecont.cnpj && dataUnecont.cnpj.length === 14) setUnecont((p) => ({ ...p, cnpj: dataUnecont.cnpj }));
    if (dataUnecont.senhaCertificado) setUnecont((p) => ({ ...p, senhaCertificado: dataUnecont.senhaCertificado }));
    if (dataUnecont.file) setUnecont((p) => ({ ...p, certificadoFile: dataUnecont.file }));
    if (dataOnvio.cnpj && dataOnvio.cnpj.length === 14) setOnvio((p) => ({ ...p, cnpj: dataOnvio.cnpj }));
    if (dataOnvio.senhaCertificado) setOnvio((p) => ({ ...p, senhaCertificado: dataOnvio.senhaCertificado }));
    if (dataOnvio.file) setOnvio((p) => ({ ...p, certificadoFile: dataOnvio.file }));

    // Use current state (after state update we need to use values from closure - React batches so we use unecont/onvio from this render; the setState above will apply for next render, but we need to run with "effective" values including sieg fill)
    const emailUnecont = unecont.email.trim();
    const senhaUnecont = unecont.senha.trim();
    let cnpjUnecont = onlyDigits(unecont.cnpj);
    let fileUnecont = unecont.certificadoFile;
    let senhaCertUnecont = unecont.senhaCertificado.trim();
    if (siegData.cnpj && siegData.cnpj.length === 14) cnpjUnecont = siegData.cnpj;
    if (siegData.file) fileUnecont = siegData.file;
    if (siegData.senhaCertificado) senhaCertUnecont = siegData.senhaCertificado;

    const emailOnvio = onvio.email.trim();
    const senhaOnvio = onvio.senha.trim();
    let cnpjOnvio = onlyDigits(onvio.cnpj);
    let fileOnvio = onvio.certificadoFile;
    let senhaCertOnvio = onvio.senhaCertificado.trim();
    if (siegData.cnpj && siegData.cnpj.length === 14) cnpjOnvio = siegData.cnpj;
    if (siegData.file) fileOnvio = siegData.file;
    if (siegData.senhaCertificado) senhaCertOnvio = siegData.senhaCertificado;

    if (!emailUnecont || !senhaUnecont) {
      setFeedback({
        msgUnecont: 'Preencha e-mail e senha na aba UNECONT.',
        msgOnvio: '',
        successUnecont: false,
        successOnvio: false,
      });
      return;
    }
    if (!emailOnvio || !senhaOnvio || cnpjOnvio.length !== 14 || !fileOnvio || !senhaCertOnvio) {
      setFeedback({
        msgUnecont: 'Preencha todos os campos obrigatórios na aba ONVIO (e-mail, senha, CNPJ 14 dígitos, certificado e senha).',
        msgOnvio: '',
        successUnecont: false,
        successOnvio: false,
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const bodyUnecont =
      cnpjUnecont.length === 14 && fileUnecont && senhaCertUnecont
        ? (() => {
            const fd = new FormData();
            fd.append('email', emailUnecont);
            fd.append('senha', senhaUnecont);
            fd.append('cnpj', cnpjUnecont);
            fd.append('certificado', fileUnecont);
            fd.append('senhaCertificado', senhaCertUnecont);
            return fd;
          })()
        : JSON.stringify({ email: emailUnecont, senha: senhaUnecont });

    const optsUnecont: RequestInit = {
      method: 'POST',
      body: bodyUnecont as BodyInit,
    };
    if (typeof bodyUnecont === 'string') {
      optsUnecont.headers = { 'Content-Type': 'application/json' };
    }

    const formOnvio = new FormData();
    formOnvio.append('email', emailOnvio);
    formOnvio.append('senha', senhaOnvio);
    formOnvio.append('cnpj', cnpjOnvio);
    formOnvio.append('certificado', fileOnvio);
    formOnvio.append('senhaCertificado', senhaCertOnvio);

    try {
      const [resUnecont, resOnvio] = await Promise.all([
        fetch('/api/unecont/executar', optsUnecont),
        fetch('/api/onvio/executar', { method: 'POST', body: formOnvio }),
      ]);
      const [textoUnecont, textoOnvio] = await Promise.all([resUnecont.text(), resOnvio.text()]);
      const dataUnecont = parseRespostaComoJson<ApiResponse>(resUnecont, textoUnecont);
      const dataOnvio = parseRespostaComoJson<ApiResponse>(resOnvio, textoOnvio);
      const msgUnecont = dataUnecont.success ? 'UNECONT: sucesso.' : 'UNECONT: ' + getMessageFromResponse(dataUnecont);
      const msgOnvio = dataOnvio.success ? 'ONVIO: sucesso.' : 'ONVIO: ' + getMessageFromResponse(dataOnvio);
      setFeedback({
        msgUnecont,
        msgOnvio,
        successUnecont: dataUnecont.success === true,
        successOnvio: dataOnvio.success === true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conexão';
      setFeedback({
        msgUnecont: 'Erro: ' + msg,
        msgOnvio: '',
        successUnecont: false,
        successOnvio: false,
      });
    } finally {
      setLoading(false);
    }
  }, [siegData, unecont, onvio, fillUnecontFromSieg, fillOnvioFromSieg, setUnecont, setOnvio]);

  return (
    <>
      <h2>Executar UNECONT e ONVIO</h2>
      <p className="hint">
        Dispara as duas automações em paralelo com os dados já preenchidos nas abas UNECONT e ONVIO.
      </p>
      <button
        type="button"
        id="btn-executar-todas"
        className={`btn btn-primary btn-block ${loading ? 'loading' : ''}`}
        disabled={loading}
        onClick={handleExecutarTodas}
        data-testid="btn-executar-todas"
      >
        <span className="btn-text" aria-hidden={loading}>
          Executar UNECONT e ONVIO
        </span>
        <span className="btn-loading" aria-hidden={!loading}>
          Executando…
        </span>
      </button>
      {feedback && (
        <div
          id="executar-todas-resultado"
          className={`executar-todas-feedback ${feedback.successUnecont && feedback.successOnvio ? 'success' : 'error'}`}
        >
          <p className={feedback.successUnecont ? 'success' : 'error'}>{escapeHtml(feedback.msgUnecont)}</p>
          {feedback.msgOnvio && (
            <p className={feedback.successOnvio ? 'success' : 'error'}>{escapeHtml(feedback.msgOnvio)}</p>
          )}
        </div>
      )}
    </>
  );
}
