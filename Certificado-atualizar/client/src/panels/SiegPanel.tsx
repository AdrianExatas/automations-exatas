import { useState } from 'react';
import SiegRegistrarForm from './sieg/SiegRegistrarForm';
import SiegEditarForm from './sieg/SiegEditarForm';

type AcaoSieg = 'registrar' | 'atualizar';

export default function SiegPanel() {
  const [acao, setAcao] = useState<AcaoSieg>('registrar');

  return (
    <>
      <h2>SIEG – Certificado</h2>
      <p className="hint">
        Cadastre ou atualize certificado na API SIEG. Os dados podem ser reaproveitados nas abas UNECONT e ONVIO.
      </p>
      <div className="sieg-choice" role="radiogroup" aria-label="Ação no SIEG">
        <label className="radio-label">
          <input
            type="radio"
            name="sieg-acao"
            value="registrar"
            checked={acao === 'registrar'}
            onChange={() => setAcao('registrar')}
          />
          <span>Registrar certificado</span>
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name="sieg-acao"
            value="atualizar"
            checked={acao === 'atualizar'}
            onChange={() => setAcao('atualizar')}
          />
          <span>Atualizar certificado</span>
        </label>
      </div>

      <div style={{ display: acao === 'registrar' ? 'block' : 'none' }}>
        <SiegRegistrarForm />
      </div>
      <div style={{ display: acao === 'atualizar' ? 'block' : 'none' }}>
        <SiegEditarForm />
      </div>
    </>
  );
}
