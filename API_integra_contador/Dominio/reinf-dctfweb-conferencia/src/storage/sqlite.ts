/**
 * Histórico de auditoria e conciliações fiscais em SQLite.
 * NUNCA armazena XMLs brutos, senhas, certificados ou tokens.
 */
import { Database } from "bun:sqlite";
import type { BatchSummary, ReconciliationResult } from "../types.ts";

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

  public close(): void {
    this.db.close();
  }
}
