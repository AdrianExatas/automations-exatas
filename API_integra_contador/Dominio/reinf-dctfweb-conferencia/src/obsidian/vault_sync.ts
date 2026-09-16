/**
 * Sincronização e Geração de Dossiês Fiscais para o Cofre Obsidian da Exatas Contabilidade
 */
import type { SqliteStorage } from "../storage/sqlite.ts";
import type { DominioCompany } from "../types.ts";

export interface DossieFiscalData {
  cnpj: string;
  razaoSocial: string;
  codigoDominio?: string;
  regime?: string;
  statusDominio?: string;
  procuracao?: {
    statusGeral: string;
    diasRestantes?: number | null;
    dataExpiracaoMaisProxima?: string | null;
    totalSistemas?: number;
    sistemas?: string[];
  };
  sitfis?: {
    situacao?: string;
    protocolo?: string | null;
    dataConsulta?: string;
  };
  caixaPostal?: {
    possuiNovasMensagens?: boolean;
    quantidadeNovasMensagens?: number;
    optanteDte?: boolean;
    dataConsulta?: string;
  };
  simplesNacional?: {
    periodoApuracao?: string;
    declaracoes?: any[];
  };
  parcelamentos?: any[];
  conferenciasRecentes?: any[];
}

export class ObsidianVaultSync {
  constructor(private readonly storage: SqliteStorage) {}

  /**
   * Compila os dados consolidados da empresa a partir do cache SQLite e do Domínio
   */
  public async compilarDossieData(
    cnpj: string,
    empresaDominio?: DominioCompany,
  ): Promise<DossieFiscalData> {
    const cleanCnpj = cnpj.replace(/\D/g, "");

    const proc = this.storage.getProcuracao(cleanCnpj);
    const sitfis = this.storage.getSitfisResult(cleanCnpj);
    const cx = this.storage.getCaixaPostalResult(cleanCnpj);
    const sn = this.storage.getSimplesResult(cleanCnpj, new Date().toISOString().substring(0, 7).replace("-", ""));
    const parcs = this.storage.getParcelamentoResult(cleanCnpj, "PARCSN");

    return {
      cnpj: cleanCnpj,
      razaoSocial: empresaDominio?.razaoSocial || `Empresa CNPJ ${cleanCnpj}`,
      codigoDominio: empresaDominio?.codiEmp,
      statusDominio: empresaDominio ? (empresaDominio.ativo ? "ATIVO" : "INATIVO") : "NAO_MAPEADO",
      procuracao: proc
        ? {
            statusGeral: proc.situacao,
            diasRestantes: proc.dias_restantes,
            dataExpiracaoMaisProxima: proc.data_expiracao,
            totalSistemas: proc.total_sistemas,
            sistemas: proc.sistemas,
          }
        : undefined,
      sitfis: sitfis
        ? {
            situacao: sitfis.situacao || "Sem relatório",
            protocolo: sitfis.protocolo,
            dataConsulta: sitfis.data_consulta,
          }
        : undefined,
      caixaPostal: cx
        ? {
            possuiNovasMensagens: cx.indicador_novas > 0,
            quantidadeNovasMensagens: cx.qtd_mensagens,
            optanteDte: true,
            dataConsulta: cx.data_consulta,
          }
        : undefined,
      simplesNacional: sn
        ? {
            periodoApuracao: sn.periodo_apuracao,
            declaracoes: sn.declaracoes,
          }
        : undefined,
      parcelamentos: parcs ? parcs.pedidos : [],
    };
  }

  /**
   * Renderiza o Dossiê Fiscal em Markdown com Frontmatter YAML estruturado
   */
  public gerarMarkdownDossie(data: DossieFiscalData): string {
    const dataHoraIso = new Date().toISOString();
    const dataHoraFormatada = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const statusProc = data.procuracao?.statusGeral || "NAO_CONSULTADA";
    const diasProc = data.procuracao?.diasRestantes !== undefined && data.procuracao?.diasRestantes !== null
      ? data.procuracao.diasRestantes
      : "N/A";
    const sitCnd = data.sitfis?.situacao || "NAO_CONSULTADA";
    const novasMsg = data.caixaPostal?.possuiNovasMensagens ? "SIM" : "NAO";

    let md = `---
tipo: dossie_fiscal
cnpj: "${data.cnpj}"
razao_social: "${data.razaoSocial.replace(/"/g, '\\"')}"
codigo_dominio: "${data.codigoDominio || ""}"
status_dominio: "${data.statusDominio}"
procuracao_status: "${statusProc}"
procuracao_dias_restantes: ${typeof diasProc === "number" ? diasProc : '"' + diasProc + '"'}
situacao_cnd: "${sitCnd}"
novas_mensagens_rfb: "${novasMsg}"
data_atualizacao: "${dataHoraIso}"
tags:
  - exatas
  - cliente
  - fiscal
  - integra-contador
---

# 🏢 Dossiê Fiscal — ${data.razaoSocial}

> **Atualizado em:** ${dataHoraFormatada} | **CNPJ:** \`${data.cnpj}\` | **Código Domínio:** \`${data.codigoDominio || "N/D"}\`

---

## 📌 Resumo Executivo da Empresa

| Indicador | Status / Valor | Ação Recomendada |
|---|:---:|---|
| **Vigência da Procuração RFB** | \`${statusProc}\` (${diasProc} dias restantes) | ${statusProc === "EXPIRADA" || statusProc === "CRITICA" ? "⚠️ **RENOVAR PROCURAÇÃO IMEDIATAMENTE**" : "✅ Regular"} |
| **Situação Fiscal e CND** | \`${sitCnd}\` | ${sitCnd.includes("Pendência") ? "⚠️ Verificar relatório no SERPRO" : "✅ CND Regular"} |
| **Caixa Postal Fiscal (DTE)** | ${data.caixaPostal?.possuiNovasMensagens ? "🚨 Novas Mensagens Não Lidas" : "✅ Caixa Postal em Dia"} | ${data.caixaPostal?.possuiNovasMensagens ? "Ler intimações na aba Caixa Postal" : "Nenhuma pendência"} |
| **Situação no Domínio** | \`${data.statusDominio}\` | Cadastro ativo no escritório |

---

## 📜 1. Procuração Eletrônica RFB (SERPRO)

- **Situação Geral:** **\`${statusProc}\`**
- **Data de Vencimento mais próxima:** \`${data.procuracao?.dataExpiracaoMaisProxima || "Não identificada"}\`
- **Total de Sistemas Delegados:** \`${data.procuracao?.totalSistemas || 0}\`
`;

    if (data.procuracao?.sistemas && data.procuracao.sistemas.length > 0) {
      md += `\n**Sistemas com Acesso Autorizado:**\n`;
      data.procuracao.sistemas.forEach((s) => {
        md += `- ${s}\n`;
      });
    }

    md += `
---

## 📬 2. Caixa Postal e Domicílio Tributário Eletrônico (DTE)

- **Possui novas mensagens:** ${data.caixaPostal?.possuiNovasMensagens ? "**SIM (Requer Atenção)**" : "Não"}
- **Quantidade de não lidas:** \`${data.caixaPostal?.quantidadeNovasMensagens || 0}\`
- **Optante pelo DTE:** ${data.caixaPostal?.optanteDte ? "Sim" : "Não"}
- **Última consulta:** \`${data.caixaPostal?.dataConsulta || "N/D"}\`

---

## 🛡️ 3. Regularidade Fiscal e Certidões

- **Diagnóstico:** \`${data.sitfis?.situacao || "Nenhuma consulta de situação fiscal registrada"}\`
- **Protocolo de emissão:** \`${data.sitfis?.protocolo || "N/D"}\`
- **Data da análise:** \`${data.sitfis?.dataConsulta || "N/D"}\`

---

## 📊 4. Simples Nacional e Parcelamentos

`;

    if (data.simplesNacional?.declaracoes && data.simplesNacional.declaracoes.length > 0) {
      md += `### Declarações PGDAS-D Recentes:\n`;
      data.simplesNacional.declaracoes.slice(0, 5).forEach((d) => {
        md += `- **PA:** \`${d.periodoApuracao}\` | Operação: \`${d.tipoOperacao}\` | DAS Pago: ${d.dasPago ? "✅ Sim" : "❌ Em Aberto"}\n`;
      });
    } else {
      md += `*Nenhum registro recente de PGDAS-D ou empresa não optante.*\n`;
    }

    if (data.parcelamentos && data.parcelamentos.length > 0) {
      md += `\n### Parcelamentos Vigentes:\n`;
      data.parcelamentos.forEach((p) => {
        md += `- **Acordo:** \`${p.numero || p.numeroProcesso || "SN"}\` | Situação: \`${p.situacao || "Ativo"}\`\n`;
      });
    }

    md += `
---
*Documento gerado automaticamente pelo **Integra Contador — Exatas Contabilidade** via API SERPRO.*
`;

    return md;
  }
}
