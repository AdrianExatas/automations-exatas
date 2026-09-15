/**
 * Ponto de entrada e exportações da automação de conferência REINF × DCTFWeb × Domínio
 */

export * from "./types.ts";
export * from "./config.ts";

export * from "./serpro/auth.ts";
export * from "./serpro/client.ts";
export * from "./serpro/dctfweb_service.ts";

export * from "./dctfweb/parser.ts";
export * from "./dctfweb/normalizer.ts";

export * from "./dominio/queries.ts";
export * from "./dominio/client.ts";
export * from "./dominio/extractor.ts";
export * from "./dominio/mock_adapter.ts";

export * from "./reconciliation/comparator.ts";
export * from "./storage/sqlite.ts";
export * from "./export/excel.ts";
export * from "./orchestrator.ts";
export * from "./server.ts";
export * from "./cli.ts";
