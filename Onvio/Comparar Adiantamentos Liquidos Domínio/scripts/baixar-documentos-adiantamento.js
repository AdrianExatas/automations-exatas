/**
 * Baixa os PDFs dos documentos listados pelo listar-documentos-adiantamento.
 * Usa o endpoint storage v1 (GET .../Folders/{folderId}/documents/{documentId}) com headers alinhados ao Postman "Download PDF".
 *
 * Entrada:
 * - Se passar um argumento (caminho para JSON): lê esse arquivo e usa documents[] do output do listar.
 * - Se não passar argumento: chama runListar() do listar e usa o array documents retornado.
 *
 * Variáveis de ambiente: ONVIO_BASE_URL, ONVIO_UDS_LONG_TOKEN, ONVIO_FIRM_COMPANY_ID (opcional), DOWNLOAD_DIR (default: ./downloads).
 *
 * Uso:
 *   npm run baixar-adiantamento
 *   node scripts/baixar-documentos-adiantamento.js list.json
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { runListar } from './listar-documentos-adiantamento.js';

const ONVIO_BASE_URL = (process.env.ONVIO_BASE_URL || 'https://onvio.com.br').replace(/\/$/, '');
const ONVIO_UDS_LONG_TOKEN = process.env.ONVIO_UDS_LONG_TOKEN || '';
const ONVIO_FIRM_COMPANY_ID = (process.env.ONVIO_FIRM_COMPANY_ID || '').trim();
const DOWNLOAD_DIR = (process.env.DOWNLOAD_DIR || './downloads').trim() || './downloads';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0';

function log(msg) {
  process.stderr.write(msg + '\n');
}

/** Caracteres inválidos em nome de arquivo (Windows/Unix). Substitui por _ */
const INVALID_FILENAME = /[\s\\/:*?"<>|]+/g;

function sanitizeFilename(name) {
  if (typeof name !== 'string') return '';
  const base = name.replace(INVALID_FILENAME, '_').trim();
  return base || '';
}

/**
 * Gera nome de arquivo único: sanitizado a partir de doc.name; se vazio ou colisão usa {documentId}.pdf ou {nome}_{documentId}.pdf
 */
function chooseFilename(doc, existing) {
  const raw = sanitizeFilename(doc.name || '');
  let base = raw.replace(/\.pdf$/i, '') || doc.documentId;
  let ext = raw.toLowerCase().endsWith('.pdf') ? '' : '.pdf';
  if (!ext) ext = '.pdf';
  let candidate = base + ext;
  if (!existing.has(candidate)) {
    existing.add(candidate);
    return candidate;
  }
  candidate = `${base}_${doc.documentId}${ext}`;
  if (!existing.has(candidate)) {
    existing.add(candidate);
    return candidate;
  }
  candidate = `${doc.documentId}.pdf`;
  existing.add(candidate);
  return candidate;
}

async function getDocuments(inputJsonPath) {
  if (inputJsonPath) {
    const raw = fs.readFileSync(inputJsonPath, 'utf8');
    const data = JSON.parse(raw);
    const list = data.documents ?? (Array.isArray(data) ? data : []);
    return list;
  }
  const out = await runListar();
  return out.documents ?? [];
}

async function downloadDocument(doc) {
  const url = `${ONVIO_BASE_URL}/api/storage/v1/Folders/${doc.folderId}/documents/${doc.documentId}`;
  const headers = {
    Accept: '*/*',
    'accept-language': 'pt-BR',
    Authorization: `UDSLongToken ${ONVIO_UDS_LONG_TOKEN}`,
    Referer: `${ONVIO_BASE_URL}/staff/`,
    'User-Agent': USER_AGENT,
  };
  if (ONVIO_FIRM_COMPANY_ID) {
    headers['x-company-id'] = ONVIO_FIRM_COMPANY_ID;
  }
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}

async function main() {
  const jsonPath = process.argv[2] || null;

  if (!ONVIO_UDS_LONG_TOKEN) {
    log('Defina ONVIO_UDS_LONG_TOKEN no .env');
    process.exit(1);
  }

  const documents = await getDocuments(jsonPath);
  if (documents.length === 0) {
    log('Nenhum documento para baixar.');
    return;
  }

  const dir = path.isAbsolute(DOWNLOAD_DIR) ? DOWNLOAD_DIR : path.resolve(process.cwd(), DOWNLOAD_DIR);
  fs.mkdirSync(dir, { recursive: true });
  log(`Pasta de saída: ${dir}`);
  log(`Total: ${documents.length} documento(s).\n`);

  const existing = new Set();
  let ok = 0;
  let err = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const filename = chooseFilename(doc, existing);
    const filepath = path.join(dir, filename);
    const n = i + 1;
    const total = documents.length;
    log(`Baixando ${n}/${total}: ${filename}`);

    try {
      const buf = await downloadDocument(doc);
      fs.writeFileSync(filepath, Buffer.from(buf));
      log(`Salvo: ${filepath}`);
      ok++;
    } catch (e) {
      log(`Erro: ${e.message}`);
      err++;
    }
  }

  log('');
  log(`Concluído: ${ok} baixado(s), ${err} erro(s).`);
}

main().catch((e) => {
  log(String(e));
  process.exit(1);
});
