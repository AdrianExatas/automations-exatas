import { useState, useCallback, useRef } from 'react';
import { useSiegData } from '../../context/SiegDataContext';
import { LISTA_UF } from '../../constants/ufs';
import { parseRespostaComoJson, onlyDigits, getMessageFromResponse } from '../../api/client';
import type { ApiResponse, ExtrairCnpjData } from '../../types/api';
import ResultMessage from '../../components/ResultMessage';
import LoadingButton from '../../components/LoadingButton';

export default function SiegRegistrarForm() {
  const { setSiegData } = useSiegData();
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regSenha, setRegSenha] = useState('');
  const [regNome, setRegNome] = useState('');
  const [regCnpj, setRegCnpj] = useState('');
  const [regUf, setRegUf] = useState('');
  const [regCnpjMsg, setRegCnpjMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regExtractLoading, setRegExtractLoading] = useState(false);
  const [regResult, setRegResult] = useState<{ success: boolean; message: string } | null>(null);
  const regFileInputRef = useRef<HTMLInputElement>(null);

  const updateSiegContext = useCallback(
    (cnpj: string, senha: string, file: File | null) => {
      setSiegData({ cnpj: onlyDigits(cnpj), senhaCertificado: senha, file });
    },
    [setSiegData]
  );

  const handleRegFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setRegFile(file);
      let newCnpj = regCnpj;
      let newNome = regNome;
      if (file?.name) {
        const matchUnderscore = file.name.match(/^(.+)_(\d{14})\.(pfx|p12)$/i);
        const matchOnlyDigits = file.name.match(/_(\d{14})\.(pfx|p12)$/i) ?? file.name.match(/(\d{14})\.(pfx|p12)$/i);
        if (matchUnderscore && !regNome.trim()) {
          newNome = (matchUnderscore[1] ?? '').trim().replace(/\s+/g, ' ');
          setRegNome(newNome);
        }
        if (matchUnderscore?.[2]) newCnpj = matchUnderscore[2];
        else if (matchOnlyDigits?.[1]) newCnpj = matchOnlyDigits[1];
        setRegCnpj(newCnpj);
      }
      updateSiegContext(newCnpj, regSenha, file);
    },
    [regCnpj, regNome, regSenha, updateSiegContext]
  );

  const handleRegSenhaChange = useCallback(
    (v: string) => {
      setRegSenha(v);
      updateSiegContext(regCnpj, v, regFile);
    },
    [regCnpj, regFile, updateSiegContext]
  );

  const handleRegCnpjChange = useCallback(
    (v: string) => {
      setRegCnpj(v);
      updateSiegContext(v, regSenha, regFile);
    },
    [regSenha, regFile, updateSiegContext]
  );

  const handleRegistrarExtractCnpj = useCallback(async () => {
    if (!regFile) {
      setRegCnpjMsg({ type: 'error', text: 'Selecione o arquivo do certificado (.pfx) primeiro.' });
      return;
    }
    if (!regSenha.trim()) {
      setRegCnpjMsg({ type: 'error', text: 'Informe a senha do certificado.' });
      return;
    }
    setRegExtractLoading(true);
    setRegCnpjMsg(null);
    try {
      const formData = new FormData();
      formData.append('certificado', regFile);
      formData.append('senha', regSenha.trim());
      const res = await fetch('/api/certificado/extrair-cnpj', { method: 'POST', body: formData });
      const texto = await res.text();
      const data = parseRespostaComoJson<ApiResponse<ExtrairCnpjData>>(res, texto);
      if (data.success && data.data?.cnpj) {
        setRegCnpj(data.data.cnpj);
        updateSiegContext(data.data.cnpj, regSenha, regFile);
        setRegCnpjMsg({ type: 'success', text: 'CNPJ extraído com sucesso.' });
      } else {
        const errData = data as { error?: string; mensagem?: string };
        setRegCnpjMsg({
          type: 'error',
          text: errData.error ?? errData.mensagem ?? 'Não foi possível extrair o CNPJ do certificado.',
        });
      }
    } catch (err) {
      setRegCnpjMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erro de conexão.' });
    } finally {
      setRegExtractLoading(false);
    }
  }, [regFile, regSenha, updateSiegContext]);

  const handleRegistrarSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!regFile || !regSenha.trim()) {
        setRegResult({ success: false, message: 'Arquivo e senha são obrigatórios.' });
        return;
      }
      if (!regNome.trim()) {
        setRegResult({ success: false, message: 'Nome do certificado (razão social) é obrigatório.' });
        return;
      }
      setRegLoading(true);
      setRegResult(null);
      try {
        const formData = new FormData();
        formData.append('certificado', regFile);
        formData.append('senha', regSenha.trim());
        formData.append('nome', regNome.trim());
        if (regCnpj.trim()) formData.append('cnpj', regCnpj.trim());
        if (regUf) formData.append('uf', regUf);
        const res = await fetch('/api/certificado/registrar', { method: 'POST', body: formData });
        const texto = await res.text();
        const data = parseRespostaComoJson<ApiResponse>(res, texto);
        setRegResult({ success: data.success === true, message: getMessageFromResponse(data) });
      } catch (err) {
        setRegResult({ success: false, message: err instanceof Error ? err.message : 'Erro de conexão.' });
      } finally {
        setRegLoading(false);
      }
    },
    [regFile, regSenha, regNome, regCnpj, regUf]
  );

  return (
    <div id="sieg-sub-registrar" className="sieg-subpanel">
      <p className="hint hint-inline">Cadastrar certificado na SIEG pela primeira vez.</p>
      <form onSubmit={handleRegistrarSubmit} id="form-registrar">
        <div className="form-group">
          <label htmlFor="reg-certificado">Arquivo do certificado (.pfx)</label>
          <input
            ref={regFileInputRef}
            type="file"
            id="reg-certificado"
            accept=".pfx,.p12"
            required
            onChange={handleRegFileChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-senha">Senha do certificado</label>
          <input
            type="password"
            id="reg-senha"
            required
            placeholder="Senha do arquivo PFX"
            autoComplete="off"
            value={regSenha}
            onChange={(e) => handleRegSenhaChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-nome">Nome do certificado (razão social)</label>
          <input
            type="text"
            id="reg-nome"
            required
            placeholder="Ex.: EMPRESA LTDA"
            autoComplete="off"
            value={regNome}
            onChange={(e) => setRegNome(e.target.value)}
          />
        </div>
        <div className="form-group form-group-inline">
          <label htmlFor="reg-cnpj">CNPJ (opcional)</label>
          <div className="input-with-btn">
            <input
              type="text"
              id="reg-cnpj"
              placeholder="Clique em Extrair CNPJ ou digite"
              autoComplete="off"
              value={regCnpj}
              onChange={(e) => handleRegCnpjChange(e.target.value)}
            />
            <button
              type="button"
              id="btn-registrar-extrair-cnpj"
              className="btn btn-secondary"
              onClick={handleRegistrarExtractCnpj}
              disabled={regExtractLoading}
            >
              {regExtractLoading ? '…' : 'Extrair CNPJ do certificado'}
            </button>
          </div>
        </div>
        {regCnpjMsg && (
          <div className={`id-erro ${regCnpjMsg.type === 'success' ? 'success' : ''}`} role="alert">
            {regCnpjMsg.text}
          </div>
        )}
        <div className="form-group">
          <label htmlFor="reg-uf">UF do certificado</label>
          <select
            id="reg-uf"
            name="uf"
            aria-label="Selecione o estado (UF) do certificado"
            value={regUf}
            onChange={(e) => setRegUf(e.target.value)}
          >
            <option value="">Selecione a UF (opcional)</option>
            {LISTA_UF.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.nome} ({u.sigla})
              </option>
            ))}
          </select>
          <p className="hint hint-inline">Se aparecer erro de UF/município, tente deixar em branco.</p>
        </div>
        <LoadingButton loading={regLoading} loadingText="Enviando…">
          Registrar certificado
        </LoadingButton>
      </form>
      <ResultMessage
        visible={!!regResult}
        success={regResult?.success ?? false}
        message={regResult?.message ?? ''}
      />
    </div>
  );
}
