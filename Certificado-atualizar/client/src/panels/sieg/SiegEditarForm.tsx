import { useState, useCallback, useRef } from 'react';
import { useSiegData } from '../../context/SiegDataContext';
import { LISTA_UF } from '../../constants/ufs';
import { parseRespostaComoJson, onlyDigits, getMessageFromResponse } from '../../api/client';
import type { ApiResponse, ExtrairCnpjData, CertificadoSieg } from '../../types/api';
import ResultMessage from '../../components/ResultMessage';
import LoadingButton from '../../components/LoadingButton';

export default function SiegEditarForm() {
  const { setSiegData } = useSiegData();
  const [editarFile, setEditarFile] = useState<File | null>(null);
  const [editarSenha, setEditarSenha] = useState('');
  const [editarCnpj, setEditarCnpj] = useState('');
  const [editarUf, setEditarUf] = useState('');
  const [editarCertificadoId, setEditarCertificadoId] = useState('');
  const [editarIdEncontrado, setEditarIdEncontrado] = useState<{ Id: string | number; Nome: string } | null>(null);
  const [editarIdErro, setEditarIdErro] = useState<string | null>(null);
  const [editarLoading, setEditarLoading] = useState(false);
  const [editarExtractLoading, setEditarExtractLoading] = useState(false);
  const [editarBuscarLoading, setEditarBuscarLoading] = useState(false);
  const [editarResult, setEditarResult] = useState<{ success: boolean; message: string } | null>(null);
  const editarFileInputRef = useRef<HTMLInputElement>(null);

  const updateSiegContext = useCallback(
    (cnpj: string, senha: string, file: File | null) => {
      setSiegData({ cnpj: onlyDigits(cnpj), senhaCertificado: senha, file });
    },
    [setSiegData]
  );

  const handleEditarFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setEditarFile(file);
      let newCnpj = editarCnpj;
      if (file?.name) {
        const match = file.name.match(/_(\d{14})\.(pfx|p12)$/i) ?? file.name.match(/(\d{14})\.(pfx|p12)$/i);
        if (match?.[1]) newCnpj = match[1];
        setEditarCnpj(newCnpj);
      }
      updateSiegContext(newCnpj, editarSenha, file);
    },
    [editarCnpj, editarSenha, updateSiegContext]
  );

  const handleEditarSenhaChange = useCallback(
    (v: string) => {
      setEditarSenha(v);
      updateSiegContext(editarCnpj, v, editarFile);
    },
    [editarCnpj, editarFile, updateSiegContext]
  );

  const handleEditarCnpjChange = useCallback(
    (v: string) => {
      setEditarCnpj(v);
      updateSiegContext(v, editarSenha, editarFile);
    },
    [editarSenha, editarFile, updateSiegContext]
  );

  const handleEditarExtractCnpj = useCallback(async () => {
    if (!editarFile) {
      setEditarIdErro('Selecione o arquivo do certificado (.pfx) primeiro.');
      setEditarIdEncontrado(null);
      setEditarCertificadoId('');
      return;
    }
    if (!editarSenha.trim()) {
      setEditarIdErro('Informe a senha do certificado.');
      setEditarIdEncontrado(null);
      setEditarCertificadoId('');
      return;
    }
    setEditarExtractLoading(true);
    setEditarIdErro(null);
    try {
      const formData = new FormData();
      formData.append('certificado', editarFile);
      formData.append('senha', editarSenha.trim());
      const res = await fetch('/api/certificado/extrair-cnpj', { method: 'POST', body: formData });
      const textoRes = await res.text();
      const dataRes = parseRespostaComoJson<ApiResponse<ExtrairCnpjData>>(res, textoRes);
      if (!dataRes.success || !dataRes.data?.cnpj) {
        const err = dataRes as { error?: string; mensagem?: string };
        setEditarIdErro(err.error ?? err.mensagem ?? 'Não foi possível extrair o CNPJ do certificado.');
        setEditarIdEncontrado(null);
        setEditarCertificadoId('');
        return;
      }
      const cnpj = dataRes.data.cnpj;
      setEditarCnpj(cnpj);
      updateSiegContext(cnpj, editarSenha, editarFile);
      const resListar = await fetch('/api/certificado/listar?cnpj=' + encodeURIComponent(cnpj));
      const textoListar = await resListar.text();
      const dataListar = parseRespostaComoJson<ApiResponse<CertificadoSieg[]>>(resListar, textoListar);
      if (!dataListar.success) {
        const err = dataListar as { message?: string; mensagem?: string };
        setEditarIdErro(err.message ?? err.mensagem ?? 'Erro ao buscar certificado.');
        setEditarIdEncontrado(null);
        setEditarCertificadoId('');
        return;
      }
      const list = dataListar.data ?? [];
      if (list.length > 0) {
        const cert = list[0]!;
        const id = cert.Id ?? cert.id ?? cert.CertificadoId ?? cert.certificadoId;
        if (id != null) {
          setEditarIdEncontrado({ Id: id, Nome: cert.Nome ?? cert.nome ?? '—' });
          setEditarCertificadoId(String(id));
          setEditarIdErro(null);
        } else {
          setEditarIdErro('Certificado encontrado mas sem ID.');
          setEditarIdEncontrado(null);
          setEditarCertificadoId('');
        }
      } else {
        setEditarIdErro('CNPJ extraído: ' + cnpj + '. Nenhum certificado na SIEG com esse CNPJ.');
        setEditarIdEncontrado(null);
        setEditarCertificadoId('');
      }
    } catch (err) {
      setEditarIdErro(err instanceof Error ? err.message : 'Não foi possível ler o certificado.');
      setEditarIdEncontrado(null);
      setEditarCertificadoId('');
    } finally {
      setEditarExtractLoading(false);
    }
  }, [editarFile, editarSenha, updateSiegContext]);

  const handleEditarBuscarId = useCallback(async () => {
    const cnpjDigits = onlyDigits(editarCnpj);
    if (cnpjDigits.length !== 14) {
      setEditarIdErro('Informe um CNPJ válido (14 dígitos).');
      setEditarIdEncontrado(null);
      setEditarCertificadoId('');
      return;
    }
    setEditarBuscarLoading(true);
    setEditarIdErro(null);
    try {
      const res = await fetch('/api/certificado/listar?cnpj=' + encodeURIComponent(cnpjDigits));
      const texto = await res.text();
      const data = parseRespostaComoJson<ApiResponse<CertificadoSieg[]>>(res, texto);
      if (!data.success) {
        const err = data as { message?: string; mensagem?: string };
        setEditarIdErro(err.message ?? err.mensagem ?? 'Erro ao buscar certificado.');
        setEditarIdEncontrado(null);
        setEditarCertificadoId('');
        return;
      }
      const list = data.data ?? [];
      if (list.length > 0) {
        const cert = list[0]!;
        const id = cert.Id ?? cert.id ?? cert.CertificadoId ?? cert.certificadoId;
        if (id != null) {
          setEditarIdEncontrado({ Id: id, Nome: cert.Nome ?? cert.nome ?? '—' });
          setEditarCertificadoId(String(id));
          setEditarIdErro(null);
        } else {
          setEditarIdErro('Certificado encontrado mas sem ID.');
          setEditarIdEncontrado(null);
          setEditarCertificadoId('');
        }
      } else {
        setEditarIdErro('Nenhum certificado encontrado na SIEG para este CNPJ.');
        setEditarIdEncontrado(null);
        setEditarCertificadoId('');
      }
    } catch (err) {
      setEditarIdErro(err instanceof Error ? err.message : 'Erro de conexão.');
      setEditarIdEncontrado(null);
      setEditarCertificadoId('');
    } finally {
      setEditarBuscarLoading(false);
    }
  }, [editarCnpj]);

  const handleEditarSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editarCertificadoId.trim()) {
        setEditarResult({ success: false, message: 'Busque o ID pelo CNPJ antes de atualizar.' });
        return;
      }
      if (!editarFile || !editarSenha.trim()) {
        setEditarResult({ success: false, message: 'Arquivo e senha do certificado são obrigatórios.' });
        return;
      }
      setEditarLoading(true);
      setEditarResult(null);
      try {
        const formData = new FormData();
        formData.append('certificadoId', editarCertificadoId.trim());
        formData.append('certificado', editarFile);
        formData.append('senha', editarSenha.trim());
        if (editarUf) formData.append('uf', editarUf);
        const res = await fetch('/api/certificado/editar', { method: 'POST', body: formData });
        const texto = await res.text();
        const data = parseRespostaComoJson<ApiResponse>(res, texto);
        setEditarResult({ success: data.success === true, message: getMessageFromResponse(data) });
      } catch (err) {
        setEditarResult({ success: false, message: err instanceof Error ? err.message : 'Erro de conexão.' });
      } finally {
        setEditarLoading(false);
      }
    },
    [editarCertificadoId, editarFile, editarSenha, editarUf]
  );

  return (
    <div id="sieg-sub-atualizar" className="sieg-subpanel">
      <p className="hint hint-inline">Substituir certificado já cadastrado na SIEG.</p>
      <form onSubmit={handleEditarSubmit} id="form-editar">
        <div className="form-group">
          <label htmlFor="editar-certificado">Arquivo do certificado (.pfx)</label>
          <input
            ref={editarFileInputRef}
            type="file"
            id="editar-certificado"
            accept=".pfx,.p12"
            required
            onChange={handleEditarFileChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="editar-senha">Senha do certificado</label>
          <input
            type="password"
            id="editar-senha"
            required
            placeholder="Senha do arquivo PFX"
            autoComplete="off"
            value={editarSenha}
            onChange={(e) => handleEditarSenhaChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="editar-uf">UF do certificado</label>
          <select
            id="editar-uf"
            name="uf"
            aria-label="Selecione o estado (UF) do certificado"
            value={editarUf}
            onChange={(e) => setEditarUf(e.target.value)}
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
        <div className="form-group form-group-inline">
          <label htmlFor="editar-cnpj">CNPJ (extraído do certificado ou digite)</label>
          <div className="input-with-btn">
            <input
              type="text"
              id="editar-cnpj"
              placeholder="Clique em Extrair CNPJ ou digite 14 dígitos"
              autoComplete="off"
              value={editarCnpj}
              onChange={(e) => handleEditarCnpjChange(e.target.value)}
            />
            <button
              type="button"
              id="btn-extrair-cnpj"
              className="btn btn-secondary"
              onClick={handleEditarExtractCnpj}
              disabled={editarExtractLoading}
            >
              {editarExtractLoading ? '…' : 'Extrair CNPJ do certificado'}
            </button>
            <button
              type="button"
              id="btn-buscar-id"
              className="btn btn-secondary"
              onClick={handleEditarBuscarId}
              disabled={editarBuscarLoading}
            >
              {editarBuscarLoading ? '…' : 'Buscar ID'}
            </button>
          </div>
        </div>
        {editarIdEncontrado && (
          <div className="id-encontrado" id="editar-id-box">
            <span className="id-encontrado-label">Certificado encontrado:</span>
            <span className="id-encontrado-nome">{editarIdEncontrado.Nome}</span>
            <span className="id-encontrado-id">ID: {String(editarIdEncontrado.Id)}</span>
          </div>
        )}
        {editarIdErro && (
          <div className="id-erro" id="editar-id-erro">
            {editarIdErro}
          </div>
        )}
        <LoadingButton loading={editarLoading} loadingText="Enviando…" disabled={!editarCertificadoId.trim()}>
          Atualizar certificado
        </LoadingButton>
      </form>
      <ResultMessage
        visible={!!editarResult}
        success={editarResult?.success ?? false}
        message={editarResult?.message ?? ''}
      />
    </div>
  );
}
