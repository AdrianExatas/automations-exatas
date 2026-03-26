import { load } from 'cheerio';
import type { Element } from 'domhandler';

export type CompanyLink = {
  identificacao: string;
  razaoSocial: string;
  msgNaoLidas: number;
  url: string;
};

export type OccurrenceSource = 'nao_lidos' | 'lidos';

export type Occurrence = {
  numero: string;
  orgao: string;
  unidade: string;
  assunto: string;
  dataPublicacao: string;
  dataCiencia: string;
  responsavelCiencia: string;
  link: string;
  source: OccurrenceSource;
  timestamp: number;
};

export interface PaginationInfo {
  currentStart: number;
  currentEnd: number;
  total: number;
  pageSize: number;
}

export interface OccurrencePage {
  messages: Occurrence[];
  pagination: PaginationInfo | null;
}

export function extractCompanies(html: string, currentUrl: string): CompanyLink[] {
  const $ = load(html);
  const table = findTableByHeaders($, ['identificacao', 'razao social', 'msg nao lidas']);
  if (!table) {
    return [];
  }

  return table
    .find('tr.trTableImpar, tr.trTablePar')
    .toArray()
    .map((row: Element): CompanyLink => {
      const cells = $(row).find('td').toArray();
      const link = $(row).find('a.trLink').first();

      return {
        identificacao: normalizeComparableText($(cells[0]).text()),
        razaoSocial: normalizeComparableText($(cells[1]).text()),
        msgNaoLidas: Number.parseInt(normalizeComparableText($(cells[2]).text()) || '0', 10) || 0,
        url: toAbsoluteUrl(link.attr('href'), currentUrl),
      };
    })
    .filter((company: CompanyLink) => company.identificacao && company.razaoSocial && company.url);
}

export function extractOccurrencesPage(
  html: string,
  currentUrl: string,
  source: OccurrenceSource,
): OccurrencePage {
  const $ = load(html);
  const table = findTableByHeaders($, ['orgao', 'assunto', 'data publicacao']);
  if (!table) {
    return {
      messages: [],
      pagination: null,
    };
  }

  const messages = table
    .find('tr.trTableImpar, tr.trTablePar')
    .toArray()
    .map((row: Element) => {
      const cells = $(row).find('td').toArray();
      const firstLink = $(row).find('td a').first();
      if (cells.length < 8) {
        return null;
      }

      const occurrence = {
        numero: normalizeComparableText($(cells[0]).text()),
        orgao: normalizeComparableText($(cells[1]).text()),
        unidade: normalizeComparableText($(cells[2]).text()),
        assunto: normalizeComparableText($(cells[4]).text()),
        dataPublicacao: normalizeComparableText($(cells[5]).text()),
        dataCiencia: normalizeComparableText($(cells[6]).text()),
        responsavelCiencia: normalizeComparableText($(cells[7]).text()),
        link: toAbsoluteUrl(firstLink.attr('href'), currentUrl) || currentUrl,
        source,
        timestamp: 0,
      };

      if (!occurrence.numero) {
        return null;
      }

      return {
        ...occurrence,
        timestamp: parseBrazilDateTime(occurrence.dataPublicacao),
      };
    })
    .filter((message: Occurrence | null): message is Occurrence => message !== null);

  return {
    messages,
    pagination: extractPaginationInfo(html, currentUrl, messages.length),
  };
}

export function extractOccurrence(
  html: string,
  currentUrl: string,
  source: OccurrenceSource,
): Occurrence | null {
  return extractOccurrencesPage(html, currentUrl, source).messages[0] ?? null;
}

export function extractLidosTabUrl(html: string, currentUrl: string): string | null {
  const $ = load(html);
  const links = $('a').toArray();
  for (const link of links) {
    if (normalizeComparableText($(link).text()).toLowerCase() !== 'lidos') {
      continue;
    }

    const href = $(link).attr('href');
    const absoluteUrl = toAbsoluteUrl(href, currentUrl);
    if (absoluteUrl) {
      return absoluteUrl;
    }
  }

  return null;
}

export function extractCaixaPostalUrl(html: string, currentUrl: string): string | null {
  const $ = load(html);
  const links = $('a').toArray();
  for (const link of links) {
    if (!normalizeComparableText($(link).text()).toLowerCase().includes('caixa postal')) {
      continue;
    }

    const href = $(link).attr('href');
    const absoluteUrl = toAbsoluteUrl(href, currentUrl);
    if (absoluteUrl) {
      return absoluteUrl;
    }
  }

  return null;
}

export function hasPortalMarker(html: string): boolean {
  const normalized = normalizeComparableText(load(html).root().text()).toLowerCase();
  return (
    normalized.includes('portal do usuario') ||
    normalized.includes('encerrar') ||
    normalized.includes('caixa postal') ||
    normalized.includes('domicilio eletronico')
  );
}

export function buildPaginatedUrl(
  currentUrl: string,
  navInicio: number,
  navMaximo: number,
): string {
  const nextUrl = new URL(currentUrl);
  nextUrl.searchParams.set('navInicio', String(navInicio));
  nextUrl.searchParams.set('navMaximo', String(navMaximo));
  return nextUrl.toString();
}

export function getNextPageUrl(
  currentUrl: string,
  pagination: PaginationInfo | null,
): string | null {
  if (!pagination || pagination.currentEnd >= pagination.total) {
    return null;
  }

  return buildPaginatedUrl(currentUrl, pagination.currentEnd + 1, pagination.pageSize);
}

export function pickLatestOccurrence(
  unreadOccurrence: Occurrence | null,
  readOccurrence: Occurrence | null,
): Occurrence | null {
  if (!unreadOccurrence) {
    return readOccurrence;
  }

  if (!readOccurrence) {
    return unreadOccurrence;
  }

  return unreadOccurrence.timestamp >= readOccurrence.timestamp ? unreadOccurrence : readOccurrence;
}

export function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseBrazilDateTime(value: string): number {
  const match = value.match(
    /(?<day>\d{2})\/(?<month>\d{2})\/(?<year>\d{4})(?:\s+(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}))?/,
  );

  if (!match?.groups) {
    return 0;
  }

  const day = Number.parseInt(match.groups.day, 10);
  const month = Number.parseInt(match.groups.month, 10);
  const year = Number.parseInt(match.groups.year, 10);
  const hour = Number.parseInt(match.groups.hour ?? '0', 10);
  const minute = Number.parseInt(match.groups.minute ?? '0', 10);
  const second = Number.parseInt(match.groups.second ?? '0', 10);

  return Date.UTC(year, month - 1, day, hour, minute, second);
}

function extractPaginationInfo(
  html: string,
  currentUrl: string,
  rowCount: number,
): PaginationInfo | null {
  const normalizedText = normalizeComparableText(load(html).root().text()).toLowerCase();
  const rangeMatch = normalizedText.match(/de (\d+) a (\d+) em (\d+) ocorrencia\(s\)/);

  if (rangeMatch) {
    const currentStart = Number.parseInt(rangeMatch[1], 10);
    const currentEnd = Number.parseInt(rangeMatch[2], 10);
    const total = Number.parseInt(rangeMatch[3], 10);

    return {
      currentStart,
      currentEnd,
      total,
      pageSize: Math.max(currentEnd - currentStart + 1, 1),
    };
  }

  if (rowCount === 0) {
    return null;
  }

  const url = new URL(currentUrl);
  const currentStart = Number.parseInt(url.searchParams.get('navInicio') ?? '1', 10) || 1;
  const pageSize = Number.parseInt(url.searchParams.get('navMaximo') ?? String(rowCount), 10) || rowCount;
  const currentEnd = currentStart + rowCount - 1;

  return {
    currentStart,
    currentEnd,
    total: currentEnd,
    pageSize: Math.max(pageSize, rowCount, 1),
  };
}

function findTableByHeaders(
  $: ReturnType<typeof load>,
  expectedHeaders: string[],
): ReturnType<ReturnType<typeof load>['prototype']['closest']> | null {
  const titleRows = $('tr.trTableTitle').toArray();
  for (const row of titleRows) {
    const text = normalizeComparableText($(row).text()).toLowerCase();
    const matches = expectedHeaders.every((header) => text.includes(header));
    if (matches) {
      return $(row).closest('table');
    }
  }

  return null;
}

function toAbsoluteUrl(input: string | undefined, currentUrl: string): string {
  if (!input) {
    return '';
  }

  return new URL(input.replace(/&amp;/g, '&'), currentUrl).toString();
}
