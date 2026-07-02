import { RetryConfig } from "../core/constants.js";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  action: () => Promise<T>,
  options: {
    maxAttempts?: number;
    minWaitMs?: number;
    maxWaitMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? RetryConfig.defaultMaxTentativas;
  const minWaitMs = options.minWaitMs ?? RetryConfig.minWaitTime * 1000;
  const maxWaitMs = options.maxWaitMs ?? RetryConfig.maxWaitTime * 1000;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts - 1 || options.shouldRetry?.(error) === false) {
        break;
      }
      const waitMs = Math.min(maxWaitMs, minWaitMs * RetryConfig.defaultBackoffBase ** attempt);
      await sleep(waitMs);
    }
  }

  throw lastError;
}
