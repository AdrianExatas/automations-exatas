/**
 * Lista documentos cujo nome contém "Adiantamento" nas pastas
 * RELATÓRIO DE LÍQUIDOS/2025 e RELATÓRIO DE LÍQUIDOS/2026.
 *
 * Fluxo:
 * 1. Chama API BD GET /api/folders?pathEndsWith=... (uma requisição por ano 2025/2026), merge e dedupe por folder_id
 * 2. Para cada folder_id, chama Onvio GET .../Folders/{id}/children (paginado)
 * 3. Filtra itens que são documento (não pasta) e nome contém "Adiantamento"
 * 4. Saída JSON agrupada por onvio_company_id e ano.
 *
 * Uso: node scripts/listar-documentos-adiantamento.js
 * Requer: .env com ONVIO_UDS_LONG_TOKEN e API BD rodando (ex.: porta 3001).
 */

import 'dotenv/config';

const API_BD_URL = (process.env.API_BD_URL || 'http://localhost:3001').replace(/\/$/, '');
const ONVIO_BASE_URL = (process.env.ONVIO_BASE_URL || 'https://onvio.com.br').replace(/\/$/, '');
const ONVIO_UDS_LONG_TOKEN = process.env.ONVIO_UDS_LONG_TOKEN || '';
const ONVIO_FIRM_COMPANY_ID = process.env.ONVIO_FIRM_COMPANY_ID || '';
/** Para teste: processar apenas esta empresa (ex.: 259 = Litoral). Deixe vazio para todas. */
const FILTER_COMPANY_ID = (process.env.FILTER_COMPANY_ID || '').trim();
/** Para teste: usar estes folder_id em vez do BD (ex.: o que funcionou no Postman). Vírgula para vários. */
const TEST_FOLDER_IDS = (process.env.TEST_FOLDER_IDS || '').trim();

const PATH_SUFFIXES = [
  'Pessoal/RELATÓRIO DE LÍQUIDOS/2025',
  'Pessoal/RELATÓRIO DE LÍQUIDOS/2026',
];

/** Path deve terminar com um destes para ser pasta de RELATÓRIO DE LÍQUIDOS do ano */
const PATH_SUFFIXES_STRICT = [
  'RELATÓRIO DE LÍQUIDOS/2025',
  'RELATÓRIO DE LÍQUIDOS/2026',
];

function isRelatorioLiquidosAno(path) {
  if (!path || typeof path !== 'string') return false;
  const p = path.replace(/\/+$/, '').trim();
  return PATH_SUFFIXES_STRICT.some(
    (suffix) => p.endsWith(suffix) || p.endsWith(suffix + '/'),
  );
}

const PAGE_SIZE = 100;
const DOCUMENT_NAME_FILTER = 'adiantamento';

/** Mensagens de progresso em stderr para não misturar com o JSON em stdout */
function progress(msg) {
  process.stderr.write(msg + '\n');
}

function isFolderLike(item) {
  const type = (item.itemType ?? item.type ?? item.containerType ?? '').toString().toLowerCase();
  return type.includes('folder');
}

function readName(item) {
  return item.name ?? item.displayName ?? '';
}

function extractYearFromPath(path) {
  if (!path || typeof path !== 'string') return null;
  if (path.endsWith('/2026') || path.includes('/2026/')) return 2026;
  if (path.endsWith('/2025') || path.includes('/2025/')) return 2025;
  return null;
}

const BD_PAGE_SIZE = 200;

/**
 * Resolve FILTER_COMPANY_ID: se for um número (ex.: código 259), busca na API /api/companies
 * a empresa com code = 259 e retorna o onvio_id. Caso contrário retorna o próprio valor (onvio_id).
 */
async function resolveCompanyId(filterValue) {
  if (!filterValue) return '';
  const trimmed = String(filterValue).trim();
  if (!trimmed) return '';
  const asNum = Number(trimmed);
  const isNumericCode = Number.isInteger(asNum) && String(asNum) === trimmed;
  if (!isNumericCode) {
    return trimmed;
  }
  progress(`Resolvendo código ${trimmed} para onvio_id (GET /api/companies)...`);
  const all = [];
  let offset = 0;
  const pageSize = 200;
  while (true) {
    const res = await fetch(
      `${API_BD_URL}/api/companies?limit=${pageSize}&offset=${offset}`,
    );
    if (!res.ok) {
      progress(`Aviso: não foi possível listar empresas (${res.status}). Usando "${trimmed}" como companyId.`);
      return trimmed;
    }
    const json = await res.json();
    const data = json.data ?? [];
    if (data.length === 0) break;
    const found = data.find((c) => c.code != null && String(c.code) === trimmed);
    if (found && found.onvio_id) {
      progress(`Empresa código ${trimmed} -> onvio_id ${found.onvio_id} (${found.name || ''}).`);
      return String(found.onvio_id);
    }
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  progress(`Aviso: nenhuma empresa com code=${trimmed} encontrada. Usando "${trimmed}" como companyId.`);
  return trimmed;
}

async function fetchBdFolders(resolvedCompanyId) {
  progress('Buscando pastas na API BD (RELATÓRIO DE LÍQUIDOS 2025/2026)...');
  const allByFolderId = new Map();
  for (const suffix of PATH_SUFFIXES) {
    let offset = 0;
    while (true) {
      const params = new URLSearchParams();
      params.set('pathEndsWith', suffix);
      if (resolvedCompanyId) {
        params.set('companyId', resolvedCompanyId);
      }
      params.set('limit', String(BD_PAGE_SIZE));
      params.set('offset', String(offset));
      const url = `${API_BD_URL}/api/folders?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API BD folders: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      const data = json.data ?? [];
      if (data.length === 0) break;
      for (const row of data) {
        const id = row.folder_id;
        if (id != null && !allByFolderId.has(id)) {
          allByFolderId.set(id, row);
        }
      }
      if (data.length < BD_PAGE_SIZE) break;
      offset += BD_PAGE_SIZE;
    }
  }
  const all = Array.from(allByFolderId.values());
  let filtered = all.filter((row) => isRelatorioLiquidosAno(row.path));
  if (resolvedCompanyId) {
    filtered = filtered.filter((row) => String(row.onvio_company_id) === String(resolvedCompanyId));
    progress(`Filtro por empresa (onvio_id ${resolvedCompanyId}): ${filtered.length} pasta(s).`);
  }
  progress(
    `Encontradas ${all.length} pasta(s) na API; ${filtered.length} são RELATÓRIO DE LÍQUIDOS 2025/2026${resolvedCompanyId ? ` (empresa filtrada)` : ''}.`,
  );
  return filtered;
}

/**
 * Headers iguais à requisição "Listar boletos" do Postman (Onvio PC),
 * para a API storage v2 retornar os documentos da pasta.
 */
function buildOnvioChildrenHeaders() {
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR',
    Authorization: `UDSLongToken ${ONVIO_UDS_LONG_TOKEN}`,
    'Content-Type': 'application/json',
    Referer: `${ONVIO_BASE_URL}/staff/`,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
  };
  if (ONVIO_FIRM_COMPANY_ID) {
    headers['x-company-id'] = ONVIO_FIRM_COMPANY_ID;
  }
  return headers;
}

async function fetchOnvioChildrenPage(folderId, from, _companyId) {
  const url = new URL(`${ONVIO_BASE_URL}/api/storage/v2/Folders/${folderId}/children`);
  url.searchParams.set('from', String(from));
  url.searchParams.set('pageSize', String(PAGE_SIZE));
  url.searchParams.set('sort', 'name:asc');
  url.searchParams.set('containersOnly', 'false');
  url.searchParams.set('trashed', 'false');
  url.searchParams.set('countDocuments', 'false');
  url.searchParams.set('calculateLocks', 'true');

  const headers = buildOnvioChildrenHeaders();

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`Onvio children ${folderId}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const items = data.data?.items ?? data.items ?? data.data ?? data.results ?? [];
  return Array.isArray(items) ? items : [];
}

async function fetchAllOnvioChildren(folderId, companyId) {
  const all = [];
  let from = 1;
  while (true) {
    const page = await fetchOnvioChildrenPage(folderId, from, companyId);
    if (page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function filterAdiantamentoDocuments(items) {
  return items.filter((item) => {
    if (isFolderLike(item)) return false;
    const name = readName(item);
    return name.toLowerCase().includes(DOCUMENT_NAME_FILTER);
  });
}

/**
 * Executa a listagem e retorna o resultado (para uso por outros scripts, ex.: baixar).
 * @returns {Promise<{ byCompany: object, byYear: object, totalFolders: number, totalDocuments: number, documents: Array }>}
 */
export async function runListar() {
  if (!ONVIO_UDS_LONG_TOKEN) {
    throw new Error('Defina ONVIO_UDS_LONG_TOKEN no .env');
  }

  const resolvedCompanyId = FILTER_COMPANY_ID ? await resolveCompanyId(FILTER_COMPANY_ID) : '';

  let folders;
  if (TEST_FOLDER_IDS) {
    const ids = TEST_FOLDER_IDS.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    folders = ids.map((folder_id) => ({
      folder_id,
      onvio_company_id: resolvedCompanyId || '',
      path: null,
    }));
    progress(`Modo teste: usando ${folders.length} folder_id(s) definido(s) em TEST_FOLDER_IDS.`);
  } else {
    folders = await fetchBdFolders(resolvedCompanyId);
  }

  if (folders.length === 0) {
    return { byCompany: {}, byYear: { 2025: [], 2026: [] }, totalFolders: 0, totalDocuments: 0, documents: [] };
  }

  const byCompany = {};
  const byYear = { 2025: [], 2026: [] };
  const documents = [];
  const total = folders.length;

  for (let i = 0; i < folders.length; i++) {
    const row = folders[i];
    const { folder_id, onvio_company_id, path } = row;
    const year = extractYearFromPath(path) || (path && path.includes('2026') ? 2026 : 2025);

    const shortPath = path && path.length > 60 ? path.slice(-60) : path;
    progress(`[${i + 1}/${total}] folder_id=${folder_id} path=${shortPath || '(teste)'}`);

    const children = await fetchAllOnvioChildren(folder_id, onvio_company_id);
    progress(`  -> API retornou ${children.length} item(ns) na pasta.`);

    const adiantamentoItems = filterAdiantamentoDocuments(children);

    if (adiantamentoItems.length > 0) {
      progress(`  -> ${adiantamentoItems.length} documento(s) com "Adiantamento" no nome.`);
    }

    for (const item of adiantamentoItems) {
      const name = readName(item);
      const docId = item.id ?? item.documentId;
      const doc = {
        documentId: docId,
        name,
        folderId: folder_id,
        path,
        onvio_company_id: onvio_company_id,
        year,
      };
      documents.push(doc);

      const cKey = String(onvio_company_id);
      if (!byCompany[cKey]) byCompany[cKey] = { 2025: [], 2026: [] };
      if (year) byCompany[cKey][year].push(doc);

      if (year === 2025 || year === 2026) byYear[year].push(doc);
    }
  }

  progress(`Concluído: ${folders.length} pasta(s), ${documents.length} documento(s) "Adiantamento".`);
  progress('');

  return {
    byCompany,
    byYear,
    totalFolders: folders.length,
    totalDocuments: documents.length,
    documents,
  };
}

async function main() {
  const out = await runListar();
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
