/**
 * Conector para o banco Domínio (Contabil Oficial) via ODBC / Sybase SQL Anywhere.
 * Operações estritamente de leitura (SELECT).
 */
import { SQL_ASSERT_SELECT_ONLY } from "./queries.ts";

export interface IDominioClient {
  executeSelect<T>(sql: string, params?: unknown[]): Promise<T[]>;
  close?(): Promise<void>;
}

export interface DominioConnectionOptions {
  dsn: string;
  user: string;
  password?: string;
}

export class DominioOdbcClient implements IDominioClient {
  private connection: unknown = null;

  constructor(private readonly options: DominioConnectionOptions) {}

  public async executeSelect<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    // Validação mandatória: rejeitar qualquer instrução que não seja SELECT
    SQL_ASSERT_SELECT_ONLY(sql);

    // Se houver módulo ODBC instalado no sistema
    try {
      if (!this.connection) {
        await this.connect();
      }
      return await this.query<T>(sql, params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Falha na consulta ao banco Domínio (${this.options.dsn}): ${msg}`);
    }
  }

  private async connect(): Promise<void> {
    try {
      // Tentativa de carregar dinamicamente o driver odbc se disponível
      const odbc = await import("odbc");
      const connectionString = `DSN=${this.options.dsn};UID=${this.options.user};PWD=${this.options.password || ""};`;
      this.connection = await odbc.connect(connectionString);
    } catch {
      throw new Error(
        `Driver ODBC não disponível ou falha ao conectar no DSN '${this.options.dsn}'. Para testes e desenvolvimento, use o MockAdapter.`,
      );
    }
  }

  private async query<T>(sql: string, params: unknown[]): Promise<T[]> {
    const conn = this.connection as {
      query: (sql: string, params: unknown[]) => Promise<T[]>;
    };
    return conn.query(sql, params);
  }

  public async close(): Promise<void> {
    if (this.connection) {
      const conn = this.connection as { close: () => Promise<void> };
      if (typeof conn.close === "function") {
        await conn.close();
      }
      this.connection = null;
    }
  }
}
