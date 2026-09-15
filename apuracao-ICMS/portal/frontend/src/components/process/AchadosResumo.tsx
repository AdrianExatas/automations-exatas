import { useMemo, useState } from 'react'
import { Card } from '../ui/Card'
import { SeverityBadge } from '../ui/SeverityBadge'
import type { Severidade } from '../ui/SeverityBadge'
import { Table } from '../ui/Table'
import type { TableColumn } from '../ui/Table'
import type { Achado } from '../../api/types'

function asSeveridade(value: string | undefined): Severidade {
  if (value === 'erro' || value === 'aviso' || value === 'info') return value
  return 'info'
}

const ACHADOS_LIMITE_PADRAO = 200

const COLUNAS: Array<TableColumn<Achado>> = [
  { key: 'codigo', header: 'Código', render: (row) => row.codigo ?? '—' },
  {
    key: 'severidade',
    header: 'Severidade',
    render: (row) => <SeverityBadge severidade={asSeveridade(row.severidade)} />,
  },
  { key: 'mensagem', header: 'Mensagem', render: (row) => row.mensagem ?? '—' },
]

interface ResumoContagem {
  erros: number
  avisos: number
  infos?: number
}

interface AchadosResumoProps {
  achados: Achado[]
  titulo?: string
  limite?: number
  isLoading?: boolean
  /**
   * Alguns módulos (ex.: icms, ipi) não expõem uma lista plana de achados,
   * apenas um resumo agregado. Quando informado, este resumo é usado nos
   * cards de contagem em vez de contar o array `achados` (que ficaria vazio).
   */
  resumoOverride?: ResumoContagem
}

/**
 * Mostra primeiro cards de contagem por severidade (erro/aviso/info); a tabela
 * completa só aparece após clicar em "Ver detalhes" — evita despejar milhares
 * de linhas de achados de uma vez em competências reais (ex.: Bonsono).
 */
export function AchadosResumo({
  achados,
  titulo = 'Achados',
  limite = ACHADOS_LIMITE_PADRAO,
  isLoading = false,
  resumoOverride,
}: AchadosResumoProps) {
  const [expandido, setExpandido] = useState(false)

  const contagem = useMemo(() => {
    if (resumoOverride) {
      return {
        erro: resumoOverride.erros,
        aviso: resumoOverride.avisos,
        info: resumoOverride.infos ?? 0,
      }
    }
    const resultado = { erro: 0, aviso: 0, info: 0 }
    for (const achado of achados) {
      resultado[asSeveridade(achado.severidade)] += 1
    }
    return resultado
  }, [achados, resumoOverride])

  const amostra = achados.slice(0, limite)

  return (
    <Card
      title={titulo}
      actions={
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="text-sm font-medium text-petrol hover:text-petrol-700"
        >
          {expandido ? 'Ocultar detalhes' : 'Ver detalhes'}
        </button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-ink-faint">Carregando achados...</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <SeverityBadge severidade="erro" count={contagem.erro} />
            <SeverityBadge severidade="aviso" count={contagem.aviso} />
            <SeverityBadge severidade="info" count={contagem.info} />
          </div>

          {expandido ? (
            <div className="mt-4">
              {achados.length > limite ? (
                <p className="mb-2 text-xs text-ink-faint">
                  Mostrando {limite} de {achados.length} achados.
                </p>
              ) : null}
              <Table
                columns={COLUNAS}
                data={amostra}
                getRowKey={(_row, index) => index}
                emptyMessage="Nenhum achado neste módulo."
              />
            </div>
          ) : null}
        </>
      )}
    </Card>
  )
}
