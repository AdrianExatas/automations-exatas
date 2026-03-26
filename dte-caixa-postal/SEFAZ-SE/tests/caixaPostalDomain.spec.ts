import { expect, test } from '@playwright/test';

import {
  buildCompanyArtifacts,
  classifyMessagePeriod,
  deduplicateMessages,
} from '../src/app/caixaPostalDomain';
import type { CompanyLink, Occurrence } from '../src/app/sefazPortalParsers';

test('classifyMessagePeriod separa mes atual, mes anterior e demais', () => {
  const referenceDate = new Date(2026, 2, 26, 12, 0, 0);

  expect(classifyMessagePeriod(Date.UTC(2026, 2, 10, 10, 0, 0), referenceDate)).toBe('mes_atual');
  expect(classifyMessagePeriod(Date.UTC(2026, 1, 10, 10, 0, 0), referenceDate)).toBe('mes_anterior');
  expect(classifyMessagePeriod(Date.UTC(2025, 11, 31, 10, 0, 0), referenceDate)).toBe('demais');
});

test('deduplicateMessages prioriza nao_lidos e buildCompanyArtifacts gera mensagens classificadas', () => {
  const company: CompanyLink = {
    identificacao: '12345678000199',
    razaoSocial: 'Empresa Exemplo LTDA',
    msgNaoLidas: 1,
    url: 'https://exemplo.local/empresa',
  };
  const readMessage: Occurrence = {
    numero: '001',
    orgao: 'SEFAZ',
    unidade: 'Unidade A',
    assunto: 'Historico',
    dataPublicacao: '20/02/2026 09:00:00',
    dataCiencia: '20/02/2026 10:00:00',
    responsavelCiencia: 'Analista',
    link: 'https://exemplo.local/msg-1',
    source: 'lidos',
    timestamp: Date.UTC(2026, 1, 20, 9, 0, 0),
  };
  const unreadMessage: Occurrence = {
    ...readMessage,
    assunto: 'Pendencia',
    source: 'nao_lidos',
    dataPublicacao: '26/03/2026 09:00:00',
    timestamp: Date.UTC(2026, 2, 26, 9, 0, 0),
  };

  expect(deduplicateMessages([readMessage, unreadMessage])).toEqual([unreadMessage]);

  const artifacts = buildCompanyArtifacts(company, [unreadMessage], [readMessage], new Date(2026, 2, 26));

  expect(artifacts.row.ultima_geral_origem).toBe('nao_lidos');
  expect(artifacts.row.ultima_nao_lida_assunto).toBe('Pendencia');
  expect(artifacts.messages).toEqual([
    {
      identificacao: '12345678000199',
      razao_social: 'Empresa Exemplo LTDA',
      origem: 'nao_lidos',
      periodo: 'mes_atual',
      chave_deduplicacao: 'https://exemplo.local/msg-1',
      numero: '001',
      orgao: 'SEFAZ',
      unidade: 'Unidade A',
      assunto: 'Pendencia',
      data_publicacao: '26/03/2026 09:00:00',
      data_ciencia: '20/02/2026 10:00:00',
      responsavel_ciencia: 'Analista',
      link: 'https://exemplo.local/msg-1',
    },
  ]);
});
