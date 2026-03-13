import type { CertificadoFormState } from '../types/api';

interface CertificadoFormFieldsProps {
  state: CertificadoFormState;
  onChange: (update: Partial<CertificadoFormState>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  prefix: string;
  cnpjLabel?: string;
  cnpjRequired?: boolean;
  certificadoRequired?: boolean;
  senhaCertificadoRequired?: boolean;
}

export default function CertificadoFormFields({
  state,
  onChange,
  fileInputRef,
  prefix,
  cnpjLabel = 'CNPJ (para atualizar certificado)',
  cnpjRequired = false,
  certificadoRequired = false,
  senhaCertificadoRequired = false,
}: CertificadoFormFieldsProps) {
  return (
    <>
      <div className="form-group">
        <label htmlFor={`${prefix}-email`}>E-mail</label>
        <input
          type="email"
          id={`${prefix}-email`}
          required
          placeholder="seu-email@exemplo.com"
          autoComplete="email"
          value={state.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-senha`}>Senha</label>
        <input
          type="password"
          id={`${prefix}-senha`}
          required
          placeholder="Sua senha"
          autoComplete="off"
          value={state.senha}
          onChange={(e) => onChange({ senha: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-cnpj`}>{cnpjLabel}</label>
        <input
          type="text"
          id={`${prefix}-cnpj`}
          required={cnpjRequired}
          placeholder="00.000.000/0001-00 ou 14 dígitos"
          autoComplete="off"
          value={state.cnpj}
          onChange={(e) => onChange({ cnpj: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-certificado`}>Arquivo do certificado (.pfx)</label>
        <input
          ref={fileInputRef}
          type="file"
          id={`${prefix}-certificado`}
          accept=".pfx,.p12"
          required={certificadoRequired}
          onChange={(e) => onChange({ certificadoFile: e.target.files?.[0] ?? null })}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${prefix}-senha-certificado`}>Senha do certificado (.pfx)</label>
        <input
          type="password"
          id={`${prefix}-senha-certificado`}
          required={senhaCertificadoRequired}
          placeholder="Senha do arquivo PFX"
          autoComplete="off"
          value={state.senhaCertificado}
          onChange={(e) => onChange({ senhaCertificado: e.target.value })}
        />
      </div>
    </>
  );
}
