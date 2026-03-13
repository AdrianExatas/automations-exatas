import type { ApiResponse } from '../types/api';

export function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function onlyDigits(str: string | null | undefined): string {
  return (str ?? '').replace(/\D/g, '');
}

/**
 * Parse response text as JSON; handles HTML responses (e.g. 404 page).
 */
export function parseRespostaComoJson<T = ApiResponse>(
  res: Response,
  texto: string
): T & { success?: boolean; message?: string; mensagem?: string; error?: string; errors?: string[] } {
  const trimmed = texto.trim();
  if (trimmed.startsWith('<')) {
    return {
      success: false,
      message:
        'O servidor retornou HTML em vez de JSON. Use o servidor do projeto: npm run build && npm run server.',
    } as T & { success: false; message: string };
  }
  try {
    return JSON.parse(texto) as T & { success?: boolean; message?: string; mensagem?: string; error?: string; errors?: string[] };
  } catch {
    return {
      success: false,
      message: 'Resposta inválida: ' + (texto.slice(0, 100) || res.status),
    } as T & { success: false; message: string };
  }
}

export function getMessageFromResponse(data: {
  success?: boolean;
  message?: string | string[];
  mensagem?: string;
  error?: string;
  errors?: string[];
}): string {
  let msg = '';
  if (Array.isArray(data.message)) {
    msg = data.message.length ? data.message.join('; ') : '';
  } else if (typeof data.message === 'string') {
    msg = data.message;
  } else {
    msg = data.mensagem ?? data.error ?? '';
  }
  if (Array.isArray(data.errors) && data.errors.length) {
    msg = msg ? `${msg}; ${data.errors.join('; ')}` : data.errors.join('; ');
  }
  return msg || (data.success ? 'Sucesso.' : 'Erro.');
}
