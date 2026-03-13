/**
 * Logger configurável para a aplicação.
 * Permite ativar/desativar logs de debug via variável de ambiente.
 */

const DEBUG = process.env.DEBUG === "true" || process.env.DEBUG === "1";

export const logger = {
  debug: (...args: unknown[]): void => {
    if (DEBUG) {
      console.log("[DEBUG]", ...args);
    }
  },

  info: (...args: unknown[]): void => {
    console.log("[INFO]", ...args);
  },

  warn: (...args: unknown[]): void => {
    console.warn("[WARN]", ...args);
  },

  error: (...args: unknown[]): void => {
    console.error("[ERROR]", ...args);
  },
};
