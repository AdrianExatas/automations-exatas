/**
 * Histórico de auditoria e conciliações fiscais em SQLite.
 * NUNCA armazena XMLs brutos, senhas, certificados ou tokens.
 */
import { Database } from "bun:sqlite";
import type {
  BatchSummary,
  CompanyReconciliationHistoryItem,
  ReconciliationResult,
} from "../types.ts";

export class SqliteStorage {
  private db: Database;

  constructor(dbPath = ":memory:") {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS execucoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_hora TEXT NOT NULL,
        competencia TEXT NOT NULL,
        tipo_execucao TEXT NOT NULL,
        total_empresas INTEGER NOT NULL,
        total_conformes INTEGER NOT NULL,
        total_divergentes INTEGER NOT NULL,
        total_pendentes INTEGER NOT NULL,
        total_sem_dctfweb INTEGER NOT NULL,
        total_erros INTEGER NOT NULL,
        chamadas_serpro_estimadas INTEGER NOT NULL,
        chamadas_serpro_realizadas INTEGER NOT NULL,
        tempo_execucao_ms INTEGER NOT NULL,
        hash_execucao TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS conferencias_empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execucao_id INTEGER NOT NULL,
        codi_emp TEXT NOT NULL,
        cnpj TEXT NOT NULL,
        razao_social TEXT NOT NULL,
        competencia TEXT NOT NULL,
        status TEXT NOT NULL,
        total_dominio REAL NOT NULL,
        total_dctfweb REAL NOT NULL,
        diferenca REAL NOT NULL,
        recibo_reinf_r2000 TEXT,
        recibo_reinf_r4000 TEXT,
        recibo_dctfweb TEXT,
        hash_resultado TEXT NOT NULL,
        mensagens TEXT,
        pendencias TEXT,
        FOREIGN KEY (execucao_id) REFERENCES execucoes(id) ON DELETE CASCADE
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS conferencias_detalhes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conferencia_empresa_id INTEGER NOT NULL,
        serie TEXT NOT NULL,
        origem INTEGER NOT NULL,
        codigo_receita TEXT NOT NULL,
        tipo_valor TEXT NOT NULL,
        valor_dominio REAL NOT NULL,
        valor_dctfweb REAL NOT NULL,
        diferenca REAL NOT NULL,
        situacao TEXT NOT NULL,
        observacao TEXT,
        FOREIGN KEY (conferencia_empresa_id) REFERENCES conferencias_empresas(id) ON DELETE CASCADE
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache_consultas_serpro (
        codi_emp TEXT NOT NULL,
        competencia TEXT NOT NULL,
        cnpj TEXT NOT NULL,
        data_consulta TEXT NOT NULL,
        status TEXT NOT NULL,
        total_dominio REAL NOT NULL,
        total_dctfweb REAL NOT NULL,
        diferenca REAL NOT NULL,
        recibo_dctfweb TEXT,
        resultado_json TEXT NOT NULL,
        PRIMARY KEY (codi_emp, competencia)
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache_situacao_fiscal (
        cnpj TEXT PRIMARY KEY,
        data_consulta TEXT NOT NULL,
        protocolo TEXT,
        situacao TEXT NOT NULL,
        pdf_base64 TEXT,
        mensagens_json TEXT
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache_caixa_postal (
        cnpj TEXT PRIMARY KEY,
        data_consulta TEXT NOT NULL,
        indicador_novas INTEGER NOT NULL,
        qtd_mensagens INTEGER NOT NULL,
        mensagens_json TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache_pagamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnpj TEXT NOT NULL,
        data_consulta TEXT NOT NULL,
        data_arrecadacao TEXT,
        numero_documento TEXT,
        tipo_documento TEXT,
        receita TEXT,
        valor_total REAL,
        payload_json TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache_simples_nacional (
        cnpj TEXT NOT NULL,
        periodo_apuracao TEXT NOT NULL,
        data_consulta TEXT NOT NULL,
        declaracoes_json TEXT,
        das_gerado_json TEXT,
        defis_json TEXT,
        PRIMARY KEY (cnpj, periodo_apuracao)
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache_parcelamentos (
        cnpj TEXT NOT NULL,
        modalidade TEXT NOT NULL,
        data_consulta TEXT NOT NULL,
        pedidos_json TEXT,
        parcelas_json TEXT,
        PRIMARY KEY (cnpj, modalidade)
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cache_procuracoes (
        cnpj TEXT PRIMARY KEY,
        outorgado TEXT NOT NULL,
        data_expiracao TEXT,
        dias_restantes INTEGER,
        situacao TEXT NOT NULL,
        total_sistemas INTEGER DEFAULT 0,
        sistemas_json TEXT,
        procuracoes_json TEXT,
        data_consulta TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS historico_worker_noturno (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_execucao TEXT NOT NULL,
        status TEXT NOT NULL,
        total_empresas INTEGER NOT NULL,
        empresas_processadas INTEGER NOT NULL,
        novas_mensagens_encontradas INTEGER NOT NULL,
        pendencias_encontradas INTEGER NOT NULL,
        procuracoes_vencendo INTEGER NOT NULL,
        duracao_ms INTEGER NOT NULL,
        detalhes_json TEXT
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS parcelamentos_pgfn (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnpj TEXT NOT NULL,
        razao_social TEXT,
        numero_negociacao TEXT NOT NULL,
        modalidade TEXT NOT NULL,
        codigo_receita TEXT DEFAULT '1734',
        valor_parcela REAL DEFAULT 0,
        dia_vencimento INTEGER DEFAULT 30,
        status TEXT DEFAULT 'EM_DIA',
        ultima_auditoria TEXT,
        detalhes_auditoria TEXT,
        observacoes TEXT,
        data_criacao TEXT NOT NULL,
        data_atualizacao TEXT NOT NULL
      );
    `);
  }

  public saveExecution(
    summary: BatchSummary,
    tipo: "INDIVIDUAL" | "LOTE" = "LOTE",
    hashExecucao = "",
  ): number {
    const insertExec = this.db.prepare(`
      INSERT INTO execucoes (
        data_hora, competencia, tipo_execucao, total_empresas,
        total_conformes, total_divergentes, total_pendentes, total_sem_dctfweb,
        total_erros, chamadas_serpro_estimadas, chamadas_serpro_realizadas,
        tempo_execucao_ms, hash_execucao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertExec.run(
      new Date().toISOString(),
      summary.competencia,
      tipo,
      summary.totalEmpresas,
      summary.conformes,
      summary.divergentes,
      summary.pendentes,
      summary.semDctfweb,
      summary.erros,
      summary.chamadasSerproEstimadas,
      summary.chamadasSerproRealizadas,
      summary.tempoExecucaoMs,
      hashExecucao || `exec_${Date.now()}`,
    );

    const execId = Number(result.lastInsertRowid);

    const insertEmp = this.db.prepare(`
      INSERT INTO conferencias_empresas (
        execucao_id, codi_emp, cnpj, razao_social, competencia, status,
        total_dominio, total_dctfweb, diferenca, recibo_reinf_r2000,
        recibo_reinf_r4000, recibo_dctfweb, hash_resultado, mensagens, pendencias
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDet = this.db.prepare(`
      INSERT INTO conferencias_detalhes (
        conferencia_empresa_id, serie, origem, codigo_receita, tipo_valor,
        valor_dominio, valor_dctfweb, diferenca, situacao, observacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of summary.resultados) {
      const resEmp = insertEmp.run(
        execId,
        r.empresa.codiEmp,
        r.empresa.cnpj,
        r.empresa.razaoSocial,
        r.competencia,
        r.status,
        r.totalGeralDominio,
        r.totalGeralDctfweb,
        r.diferencaGeral,
        r.reciboReinfR2000 || null,
        r.reciboReinfR4000 || null,
        r.reciboDctfweb || null,
        r.hashResultado,
        JSON.stringify(r.mensagens),
        JSON.stringify(r.pendencias),
      );

      const empId = Number(resEmp.lastInsertRowid);

      for (const det of r.detalhes) {
        insertDet.run(
          empId,
          det.serie,
          det.origem,
          det.codigoReceita,
          det.tipoValor,
          det.valorDominio,
          det.valorDctfweb,
          det.diferenca,
          det.situacao,
          det.observacao || null,
        );
      }

      // Persistir no cache de empresas para consultas subsequentes sem tarifação
      this.saveCompanyResult(r);
    }

    return execId;
  }

  public saveCompanyResult(r: ReconciliationResult): void {
    const dataConsulta = r.dataUltimaConsulta || new Date().toISOString();
    const payloadJson = JSON.stringify({
      ...r,
      dataUltimaConsulta: dataConsulta,
      origemConsulta: "CACHE_PERSISTIDO",
    });

    const stmt = this.db.prepare(`
      INSERT INTO cache_consultas_serpro (
        codi_emp, competencia, cnpj, data_consulta, status,
        total_dominio, total_dctfweb, diferenca, recibo_dctfweb, resultado_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(codi_emp, competencia) DO UPDATE SET
        data_consulta = excluded.data_consulta,
        status = excluded.status,
        total_dominio = excluded.total_dominio,
        total_dctfweb = excluded.total_dctfweb,
        diferenca = excluded.diferenca,
        recibo_dctfweb = excluded.recibo_dctfweb,
        resultado_json = excluded.resultado_json
    `);

    stmt.run(
      r.empresa.codiEmp,
      r.competencia,
      r.empresa.cnpj,
      dataConsulta,
      r.status,
      r.totalGeralDominio,
      r.totalGeralDctfweb,
      r.diferencaGeral,
      r.reciboDctfweb || null,
      payloadJson,
    );
  }

  public getCompanyResult(codiEmp: string, competencia: string): ReconciliationResult | null {
    const row = this.db.prepare(`
      SELECT resultado_json, data_consulta FROM cache_consultas_serpro
      WHERE codi_emp = ? AND competencia = ?
    `).get(codiEmp, competencia) as { resultado_json: string; data_consulta: string } | undefined;

    if (!row) return null;
    try {
      const res = JSON.parse(row.resultado_json) as ReconciliationResult;
      res.dataUltimaConsulta = row.data_consulta;
      res.origemConsulta = "CACHE_PERSISTIDO";
      return res;
    } catch {
      return null;
    }
  }

  public getPersistedResultsByCompetencia(competencia: string): ReconciliationResult[] {
    const rows = this.db.prepare(`
      SELECT resultado_json, data_consulta FROM cache_consultas_serpro
      WHERE competencia = ?
    `).all(competencia) as Array<{ resultado_json: string; data_consulta: string }>;

    const results: ReconciliationResult[] = [];
    for (const r of rows) {
      try {
        const item = JSON.parse(r.resultado_json) as ReconciliationResult;
        item.dataUltimaConsulta = r.data_consulta;
        item.origemConsulta = "CACHE_PERSISTIDO";
        results.push(item);
      } catch {
        // Ignora corrompido
      }
    }
    return results;
  }

  public getCompanyReconciliationHistory(
    codiEmp: string,
    limit = 6,
  ): CompanyReconciliationHistoryItem[] {
    const safeLimit = Math.min(12, Math.max(1, Math.trunc(limit) || 6));
    return this.db.prepare(`
      SELECT
        competencia,
        status,
        total_dominio AS totalGeralDominio,
        total_dctfweb AS totalGeralDctfweb,
        diferenca AS diferencaGeral,
        data_consulta AS dataUltimaConsulta
      FROM cache_consultas_serpro
      WHERE codi_emp = ?
      ORDER BY competencia DESC, data_consulta DESC
      LIMIT ?
    `).all(codiEmp, safeLimit) as CompanyReconciliationHistoryItem[];
  }

  public listExecutions(limit = 50): Array<Record<string, unknown>> {
    return this.db.prepare(`
      SELECT * FROM execucoes ORDER BY id DESC LIMIT ?
    `).all(limit) as Array<Record<string, unknown>>;
  }

  public getExecutionResults(execucaoId: number): Array<Record<string, unknown>> {
    const empresas = this.db.prepare(`
      SELECT * FROM conferencias_empresas WHERE execucao_id = ? ORDER BY id ASC
    `).all(execucaoId) as Array<Record<string, unknown>>;

    for (const emp of empresas) {
      const detalhes = this.db.prepare(`
        SELECT * FROM conferencias_detalhes WHERE conferencia_empresa_id = ? ORDER BY id ASC
      `).all(emp.id as number);
      emp.detalhes = detalhes;
      try {
        emp.mensagens = emp.mensagens ? JSON.parse(emp.mensagens as string) : [];
      } catch {
        emp.mensagens = [];
      }
      try {
        emp.pendencias = emp.pendencias ? JSON.parse(emp.pendencias as string) : [];
      } catch {
        emp.pendencias = [];
      }
    }

    return empresas;
  }

  // --- Módulo Situação Fiscal ---
  public saveSitfisResult(cnpj: string, data: {
    protocolo?: string;
    situacao: string;
    pdfBase64?: string;
    mensagens?: any[];
  }): void {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    this.db.prepare(`
      INSERT OR REPLACE INTO cache_situacao_fiscal (cnpj, data_consulta, protocolo, situacao, pdf_base64, mensagens_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      cleanCnpj,
      new Date().toISOString(),
      data.protocolo || null,
      data.situacao,
      data.pdfBase64 || null,
      JSON.stringify(data.mensagens || [])
    );
  }

  public getSitfisResult(cnpj: string): {
    cnpj: string;
    data_consulta: string;
    protocolo: string | null;
    situacao: string;
    pdf_base64: string | null;
    mensagens: any[];
  } | null {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const row = this.db.prepare(`SELECT * FROM cache_situacao_fiscal WHERE cnpj = ?`).get(cleanCnpj) as any;
    if (!row) return null;
    return {
      ...row,
      mensagens: row.mensagens_json ? JSON.parse(row.mensagens_json) : [],
    };
  }

  public listAllSitfisResults(): Array<{
    cnpj: string;
    data_consulta: string;
    protocolo: string | null;
    situacao: string;
    temPdf: boolean;
  }> {
    const rows = this.db.prepare(`
      SELECT cnpj, data_consulta, protocolo, situacao, (pdf_base64 IS NOT NULL AND length(pdf_base64) > 0) AS temPdf
      FROM cache_situacao_fiscal ORDER BY data_consulta DESC
    `).all() as any[];
    return rows.map((r) => ({ ...r, temPdf: Boolean(r.temPdf) }));
  }

  // --- Módulo Caixa Postal ---
  public saveCaixaPostalResult(cnpj: string, data: {
    indicadorNovas: number;
    qtdMensagens: number;
    mensagens: any[];
  }): void {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    this.db.prepare(`
      INSERT OR REPLACE INTO cache_caixa_postal (cnpj, data_consulta, indicador_novas, qtd_mensagens, mensagens_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      cleanCnpj,
      new Date().toISOString(),
      data.indicadorNovas,
      data.qtdMensagens,
      JSON.stringify(data.mensagens)
    );
  }

  public getCaixaPostalResult(cnpj: string): {
    cnpj: string;
    data_consulta: string;
    indicador_novas: number;
    qtd_mensagens: number;
    mensagens: any[];
  } | null {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const row = this.db.prepare(`SELECT * FROM cache_caixa_postal WHERE cnpj = ?`).get(cleanCnpj) as any;
    if (!row) return null;
    return {
      ...row,
      mensagens: row.mensagens_json ? JSON.parse(row.mensagens_json) : [],
    };
  }

  public listAllCaixaPostalResults(): Array<{
    cnpj: string;
    data_consulta: string;
    indicador_novas: number;
    qtd_mensagens: number;
  }> {
    return this.db.prepare(`
      SELECT cnpj, data_consulta, indicador_novas, qtd_mensagens
      FROM cache_caixa_postal ORDER BY data_consulta DESC
    `).all() as any[];
  }

  // --- Módulo Pagamentos ---
  public savePagamentosResult(cnpj: string, pagamentos: any[]): void {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const now = new Date().toISOString();
    const insert = this.db.prepare(`
      INSERT INTO cache_pagamentos (cnpj, data_consulta, data_arrecadacao, numero_documento, tipo_documento, receita, valor_total, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.prepare(`DELETE FROM cache_pagamentos WHERE cnpj = ?`).run(cleanCnpj);

    const transaction = this.db.transaction((items: any[]) => {
      for (const p of items) {
        insert.run(
          cleanCnpj,
          now,
          p.dataArrecadacao || null,
          p.numeroDocumento || null,
          p.tipoDocumento || "DARF",
          p.receitaPrincipalCodigo || null,
          p.valorTotal || 0,
          JSON.stringify(p)
        );
      }
    });
    transaction(pagamentos);
  }

  public getPagamentosResult(cnpj: string): any[] {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const rows = this.db.prepare(`
      SELECT payload_json FROM cache_pagamentos WHERE cnpj = ? ORDER BY data_arrecadacao DESC
    `).all(cleanCnpj) as Array<{ payload_json: string }>;
    return rows.map((r) => JSON.parse(r.payload_json));
  }

  public listAllPagamentos(limit = 100): any[] {
    const rows = this.db.prepare(`
      SELECT payload_json FROM cache_pagamentos ORDER BY data_arrecadacao DESC LIMIT ?
    `).all(limit) as Array<{ payload_json: string }>;
    return rows.map((r) => JSON.parse(r.payload_json));
  }

  // --- Módulo Simples Nacional ---
  public saveSimplesResult(
    cnpj: string,
    periodoApuracao: string,
    data: {
      declaracoes?: any[];
      dasGerado?: any;
      defis?: any[];
    },
  ): void {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const pa = periodoApuracao.replace(/\D/g, "");
    const now = new Date().toISOString();

    const existing = this.getSimplesResult(cleanCnpj, pa);
    const declJson = data.declaracoes ? JSON.stringify(data.declaracoes) : existing?.declaracoes_json || null;
    const dasJson = data.dasGerado ? JSON.stringify(data.dasGerado) : existing?.das_gerado_json || null;
    const defisJson = data.defis ? JSON.stringify(data.defis) : existing?.defis_json || null;

    this.db.prepare(`
      INSERT INTO cache_simples_nacional (cnpj, periodo_apuracao, data_consulta, declaracoes_json, das_gerado_json, defis_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(cnpj, periodo_apuracao) DO UPDATE SET
        data_consulta = excluded.data_consulta,
        declaracoes_json = COALESCE(excluded.declaracoes_json, cache_simples_nacional.declaracoes_json),
        das_gerado_json = COALESCE(excluded.das_gerado_json, cache_simples_nacional.das_gerado_json),
        defis_json = COALESCE(excluded.defis_json, cache_simples_nacional.defis_json)
    `).run(cleanCnpj, pa, now, declJson, dasJson, defisJson);
  }

  public getSimplesResult(cnpj: string, periodoApuracao: string): any {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const pa = periodoApuracao.replace(/\D/g, "");
    const row = this.db.prepare(`
      SELECT * FROM cache_simples_nacional WHERE cnpj = ? AND periodo_apuracao = ?
    `).get(cleanCnpj, pa) as any;
    if (!row) return null;

    return {
      cnpj: row.cnpj,
      periodo_apuracao: row.periodo_apuracao,
      data_consulta: row.data_consulta,
      declaracoes: row.declaracoes_json ? JSON.parse(row.declaracoes_json) : [],
      dasGerado: row.das_gerado_json ? JSON.parse(row.das_gerado_json) : null,
      defis: row.defis_json ? JSON.parse(row.defis_json) : [],
    };
  }

  public listAllSimplesResults(): any[] {
    const rows = this.db.prepare(`
      SELECT * FROM cache_simples_nacional ORDER BY data_consulta DESC
    `).all() as any[];

    return rows.map((row) => ({
      cnpj: row.cnpj,
      periodo_apuracao: row.periodo_apuracao,
      data_consulta: row.data_consulta,
      declaracoes: row.declaracoes_json ? JSON.parse(row.declaracoes_json) : [],
      dasGerado: row.das_gerado_json ? JSON.parse(row.das_gerado_json) : null,
      defis: row.defis_json ? JSON.parse(row.defis_json) : [],
    }));
  }

  // --- Módulo Parcelamentos ---
  public saveParcelamentoResult(
    cnpj: string,
    modalidade: "PARCSN" | "PARCMEI",
    data: {
      pedidos?: any[];
      parcelas?: any[];
    },
  ): void {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const now = new Date().toISOString();

    const existing = this.getParcelamentoResult(cleanCnpj, modalidade);
    const pedidosJson = data.pedidos ? JSON.stringify(data.pedidos) : existing?.pedidos_json || null;
    const parcelasJson = data.parcelas ? JSON.stringify(data.parcelas) : existing?.parcelas_json || null;

    this.db.prepare(`
      INSERT INTO cache_parcelamentos (cnpj, modalidade, data_consulta, pedidos_json, parcelas_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(cnpj, modalidade) DO UPDATE SET
        data_consulta = excluded.data_consulta,
        pedidos_json = COALESCE(excluded.pedidos_json, cache_parcelamentos.pedidos_json),
        parcelas_json = COALESCE(excluded.parcelas_json, cache_parcelamentos.parcelas_json)
    `).run(cleanCnpj, modalidade, now, pedidosJson, parcelasJson);
  }

  public getParcelamentoResult(cnpj: string, modalidade: "PARCSN" | "PARCMEI" = "PARCSN"): any {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const row = this.db.prepare(`
      SELECT * FROM cache_parcelamentos WHERE cnpj = ? AND modalidade = ?
    `).get(cleanCnpj, modalidade) as any;
    if (!row) return null;

    return {
      cnpj: row.cnpj,
      modalidade: row.modalidade,
      data_consulta: row.data_consulta,
      pedidos: row.pedidos_json ? JSON.parse(row.pedidos_json) : [],
      parcelas: row.parcelas_json ? JSON.parse(row.parcelas_json) : [],
    };
  }

  public listAllParcelamentos(): any[] {
    const rows = this.db.prepare(`
      SELECT * FROM cache_parcelamentos ORDER BY data_consulta DESC
    `).all() as any[];

    return rows.map((row) => ({
      cnpj: row.cnpj,
      modalidade: row.modalidade,
      data_consulta: row.data_consulta,
      pedidos: row.pedidos_json ? JSON.parse(row.pedidos_json) : [],
      parcelas: row.parcelas_json ? JSON.parse(row.parcelas_json) : [],
    }));
  }

  // --- Módulo Procurações RFB ---
  public saveProcuracao(dados: {
    cnpj: string;
    outorgado?: string;
    data_expiracao?: string | null;
    dataExpiracaoMaisProxima?: string | null;
    dias_restantes?: number | null;
    menorDiasRestantes?: number | null;
    situacao?: string;
    statusGeral?: string;
    total_sistemas?: number;
    totalSistemas?: number;
    sistemas?: string[];
    procuracoes?: any[];
  }): void {
    const cleanCnpj = dados.cnpj.replace(/\D/g, "");
    const cleanOutorgado = (dados.outorgado || "").replace(/\D/g, "");
    const now = new Date().toISOString();
    const sistemasJson = JSON.stringify(dados.sistemas || []);
    const procuracoesJson = JSON.stringify(dados.procuracoes || []);
    const situacao = dados.situacao || dados.statusGeral || "VIGENTE";
    const dataExp = dados.data_expiracao || dados.dataExpiracaoMaisProxima || null;
    const diasRest = dados.dias_restantes ?? dados.menorDiasRestantes ?? null;
    const totalSistemas = dados.total_sistemas ?? dados.totalSistemas ?? (dados.sistemas ? dados.sistemas.length : 0);

    this.db.prepare(`
      INSERT INTO cache_procuracoes (
        cnpj, outorgado, data_expiracao, dias_restantes, situacao, total_sistemas, sistemas_json, procuracoes_json, data_consulta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cnpj) DO UPDATE SET
        outorgado = excluded.outorgado,
        data_expiracao = excluded.data_expiracao,
        dias_restantes = excluded.dias_restantes,
        situacao = excluded.situacao,
        total_sistemas = excluded.total_sistemas,
        sistemas_json = excluded.sistemas_json,
        procuracoes_json = excluded.procuracoes_json,
        data_consulta = excluded.data_consulta
    `).run(
      cleanCnpj,
      cleanOutorgado,
      dataExp,
      diasRest,
      situacao,
      totalSistemas,
      sistemasJson,
      procuracoesJson,
      now
    );
  }

  public getProcuracao(cnpj: string): any {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const row = this.db.prepare(`
      SELECT * FROM cache_procuracoes WHERE cnpj = ?
    `).get(cleanCnpj) as any;
    if (!row) return null;

    return {
      cnpj: row.cnpj,
      outorgado: row.outorgado,
      data_expiracao: row.data_expiracao,
      dias_restantes: row.dias_restantes,
      situacao: row.situacao,
      total_sistemas: row.total_sistemas,
      sistemas: row.sistemas_json ? JSON.parse(row.sistemas_json) : [],
      procuracoes: row.procuracoes_json ? JSON.parse(row.procuracoes_json) : [],
      data_consulta: row.data_consulta,
    };
  }

  public listAllProcuracoes(): any[] {
    const rows = this.db.prepare(`
      SELECT * FROM cache_procuracoes ORDER BY dias_restantes ASC NULLS LAST
    `).all() as any[];

    return rows.map((row) => ({
      cnpj: row.cnpj,
      outorgado: row.outorgado,
      data_expiracao: row.data_expiracao,
      dias_restantes: row.dias_restantes,
      situacao: row.situacao,
      total_sistemas: row.total_sistemas,
      sistemas: row.sistemas_json ? JSON.parse(row.sistemas_json) : [],
      procuracoes: row.procuracoes_json ? JSON.parse(row.procuracoes_json) : [],
      data_consulta: row.data_consulta,
    }));
  }

  // --- Módulo Worker Noturno / Varredura Automática ---
  public saveWorkerHistorico(execucao: {
    status: string;
    total_empresas: number;
    empresas_processadas: number;
    novas_mensagens_encontradas: number;
    pendencias_encontradas: number;
    procuracoes_vencendo: number;
    duracao_ms: number;
    detalhes?: any;
  }): number {
    const now = new Date().toISOString();
    const detalhesJson = execucao.detalhes ? JSON.stringify(execucao.detalhes) : null;

    const res = this.db.prepare(`
      INSERT INTO historico_worker_noturno (
        data_execucao, status, total_empresas, empresas_processadas,
        novas_mensagens_encontradas, pendencias_encontradas, procuracoes_vencendo,
        duracao_ms, detalhes_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      now,
      execucao.status,
      execucao.total_empresas,
      execucao.empresas_processadas,
      execucao.novas_mensagens_encontradas,
      execucao.pendencias_encontradas,
      execucao.procuracoes_vencendo,
      execucao.duracao_ms,
      detalhesJson
    );

    return Number(res.lastInsertRowid);
  }

  public listWorkerHistorico(limit: number = 20): any[] {
    const rows = this.db.prepare(`
      SELECT * FROM historico_worker_noturno ORDER BY id DESC LIMIT ?
    `).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      data_execucao: r.data_execucao,
      status: r.status,
      total_empresas: r.total_empresas,
      empresas_processadas: r.empresas_processadas,
      novas_mensagens_encontradas: r.novas_mensagens_encontradas,
      pendencias_encontradas: r.pendencias_encontradas,
      procuracoes_vencendo: r.procuracoes_vencendo,
      duracao_ms: r.duracao_ms,
      detalhes: r.detalhes_json ? JSON.parse(r.detalhes_json) : null,
    }));
  }

  public getLatestWorkerHistorico(): any | null {
    const r = this.db.prepare(`
      SELECT * FROM historico_worker_noturno ORDER BY id DESC LIMIT 1
    `).get() as any;
    if (!r) return null;

    return {
      id: r.id,
      data_execucao: r.data_execucao,
      status: r.status,
      total_empresas: r.total_empresas,
      empresas_processadas: r.empresas_processadas,
      novas_mensagens_encontradas: r.novas_mensagens_encontradas,
      pendencias_encontradas: r.pendencias_encontradas,
      procuracoes_vencendo: r.procuracoes_vencendo,
      duracao_ms: r.duracao_ms,
      detalhes: r.detalhes_json ? JSON.parse(r.detalhes_json) : null,
    };
  }

  public saveParcelamentoPgfn(p: ParcelamentoPgfnInput): number {
    const now = new Date().toISOString();
    if (p.id) {
      this.db.prepare(`
        UPDATE parcelamentos_pgfn
        SET cnpj = ?, razao_social = ?, numero_negociacao = ?, modalidade = ?,
            codigo_receita = ?, valor_parcela = ?, dia_vencimento = ?,
            status = COALESCE(?, status), observacoes = ?, data_atualizacao = ?
        WHERE id = ?
      `).run(
        p.cnpj.replace(/\D/g, ""),
        p.razao_social || "",
        p.numero_negociacao,
        p.modalidade,
        p.codigo_receita || "1734",
        p.valor_parcela || 0,
        p.dia_vencimento || 30,
        p.status || "EM_DIA",
        p.observacoes || "",
        now,
        p.id
      );
      return p.id;
    }

    const res = this.db.prepare(`
      INSERT INTO parcelamentos_pgfn (
        cnpj, razao_social, numero_negociacao, modalidade, codigo_receita,
        valor_parcela, dia_vencimento, status, observacoes, data_criacao, data_atualizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      p.cnpj.replace(/\D/g, ""),
      p.razao_social || "",
      p.numero_negociacao,
      p.modalidade,
      p.codigo_receita || "1734",
      p.valor_parcela || 0,
      p.dia_vencimento || 30,
      p.status || "EM_DIA",
      p.observacoes || "",
      now,
      now
    );

    return Number(res.lastInsertRowid);
  }

  public listParcelamentosPgfn(cnpj?: string): ParcelamentoPgfnRecord[] {
    let query = "SELECT * FROM parcelamentos_pgfn";
    const params: any[] = [];
    if (cnpj) {
      query += " WHERE cnpj = ?";
      params.push(cnpj.replace(/\D/g, ""));
    }
    query += " ORDER BY id DESC";

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      cnpj: r.cnpj,
      razao_social: r.razao_social,
      numero_negociacao: r.numero_negociacao,
      modalidade: r.modalidade,
      codigo_receita: r.codigo_receita,
      valor_parcela: r.valor_parcela,
      dia_vencimento: r.dia_vencimento,
      status: r.status,
      ultima_auditoria: r.ultima_auditoria,
      detalhes_auditoria: r.detalhes_auditoria,
      observacoes: r.observacoes,
      data_criacao: r.data_criacao,
      data_atualizacao: r.data_atualizacao,
    }));
  }

  public getParcelamentoPgfn(id: number): ParcelamentoPgfnRecord | null {
    const r = this.db.prepare("SELECT * FROM parcelamentos_pgfn WHERE id = ?").get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      cnpj: r.cnpj,
      razao_social: r.razao_social,
      numero_negociacao: r.numero_negociacao,
      modalidade: r.modalidade,
      codigo_receita: r.codigo_receita,
      valor_parcela: r.valor_parcela,
      dia_vencimento: r.dia_vencimento,
      status: r.status,
      ultima_auditoria: r.ultima_auditoria,
      detalhes_auditoria: r.detalhes_auditoria,
      observacoes: r.observacoes,
      data_criacao: r.data_criacao,
      data_atualizacao: r.data_atualizacao,
    };
  }

  public deleteParcelamentoPgfn(id: number): boolean {
    const res = this.db.prepare("DELETE FROM parcelamentos_pgfn WHERE id = ?").run(id);
    return res.changes > 0;
  }

  public updateParcelamentoPgfnAuditoria(id: number, status: string, detalhes: string): boolean {
    const now = new Date().toISOString();
    const res = this.db.prepare(`
      UPDATE parcelamentos_pgfn
      SET status = ?, ultima_auditoria = ?, detalhes_auditoria = ?, data_atualizacao = ?
      WHERE id = ?
    `).run(status, now, detalhes, now, id);
    return res.changes > 0;
  }

  public close(): void {
    this.db.close();
  }
}

export interface ParcelamentoPgfnInput {
  id?: number;
  cnpj: string;
  razao_social?: string;
  numero_negociacao: string;
  modalidade: string;
  codigo_receita?: string;
  valor_parcela?: number;
  dia_vencimento?: number;
  status?: string;
  observacoes?: string;
}

export interface ParcelamentoPgfnRecord extends ParcelamentoPgfnInput {
  id: number;
  ultima_auditoria?: string;
  detalhes_auditoria?: string;
  data_criacao: string;
  data_atualizacao: string;
}
