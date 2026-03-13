import type { ApiResponse } from '../types/api';
import type { DefaultsUnecont, DefaultsOnvio } from '../types/api';
import { parseRespostaComoJson } from './client';

export async function fetchDefaultsUnecont(): Promise<DefaultsUnecont> {
  const res = await fetch('/api/defaults/unecont');
  const texto = await res.text();
  const data = parseRespostaComoJson<ApiResponse<DefaultsUnecont>>(res, texto);
  if (data.success && data.data) {
    return data.data;
  }
  return { email: '', senha: '' };
}

export async function fetchDefaultsOnvio(): Promise<DefaultsOnvio> {
  const res = await fetch('/api/defaults/onvio');
  const texto = await res.text();
  const data = parseRespostaComoJson<ApiResponse<DefaultsOnvio>>(res, texto);
  if (data.success && data.data) {
    return data.data;
  }
  return { email: '', senha: '', cnpj: '' };
}
