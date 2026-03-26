import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { UserData } from '../types';

/**
 * Exporta dados para CSV
 */
export function exportToCSV(
  usersData: UserData[],
  outputPath: string = 'test-results/usuarios-extraidos.csv'
): string {
  try {
    // Criar diretório se não existir
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Cabeçalho
    const headers = [
      'Nome',
      'CPF',
      'Telefone',
      'E-mail de Contato',
      'E-mail de Login',
      'Situação',
      'Departamentos Habilitados',
      'Acesso às pastas',
      'Empresas',
      'Inscrições',
      'Permissões'
    ];

    // Dados
    const rows = usersData.map(user => {
      const departamentosStr = user.departamentos
        .filter(d => d.habilitado === true)
        .map(d => `${d.codigo} - ${d.nome}`)
        .join('; ');

      const acessoPastasStr = (user.acessoPastas || [])
        .filter(d => d.habilitado === true)
        .map(d => {
          const nomeLimpo = (d.nome || '').replace(/\s*Departamento do Sistema\s*/gi, '').trim();
          return `${d.codigo} - ${nomeLimpo}`;
        })
        .filter(s => s && s.trim())
        .join('; ');

      const empresasStr = user.empresas
        .map(e => {
          if (e.empresa && e.inscricao) {
            return `${e.empresa} (${e.inscricao})`;
          } else if (e.empresa) {
            return e.empresa;
          } else if (e.inscricao) {
            return `Inscrição: ${e.inscricao}`;
          }
          return '';
        })
        .filter(e => e)
        .join('; ');

      const inscricoesStr = user.empresas
        .map(e => e.inscricao || '')
        .filter(i => i)
        .join('; ');

      const permissoesAtivas = user.permissoes.filter(p => {
        const pLower = p.toLowerCase();
        return !pLower.includes('inativo') && 
               !pLower.includes('desativado') && 
               !pLower.includes('desabilitado');
      });
      const permissoesStr = permissoesAtivas.join('; ');

      return [
        user.nome || '',
        user.cpf || '',
        user.telefone || '',
        user.emailContato || '',
        user.emailLogin || '',
        user.situacao || 'Ativo',
        departamentosStr,
        acessoPastasStr,
        empresasStr,
        inscricoesStr,
        permissoesStr
      ];
    });

    // Criar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escapar vírgulas e aspas
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    fs.writeFileSync(outputPath, csvContent, 'utf8');
    logger.success(`Dados exportados para CSV: ${outputPath}`, { path: outputPath, usersCount: usersData.length });
    return outputPath;
  } catch (error) {
    logger.error('Erro ao exportar para CSV', error as Error, { path: outputPath });
    throw error;
  }
}

/**
 * Exporta dados para JSON
 */
export function exportToJSON(
  usersData: UserData[],
  outputPath: string = 'test-results/usuarios-extraidos.json'
): string {
  try {
    // Criar diretório se não existir
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const jsonContent = JSON.stringify(usersData, null, 2);
    fs.writeFileSync(outputPath, jsonContent, 'utf8');
    logger.success(`Dados exportados para JSON: ${outputPath}`, { path: outputPath, usersCount: usersData.length });
    return outputPath;
  } catch (error) {
    logger.error('Erro ao exportar para JSON', error as Error, { path: outputPath });
    throw error;
  }
}

/**
 * Exporta dados para múltiplos formatos
 */
export function exportToMultipleFormats(
  usersData: UserData[],
  basePath: string = 'test-results/usuarios-extraidos',
  formats: Array<'xlsx' | 'csv' | 'json'> = ['xlsx', 'csv', 'json']
): Record<string, string> {
  const results: Record<string, string> = {};

  if (formats.includes('xlsx')) {
    // Usar função existente de saveToExcel
    const { saveToExcel } = require('./extractUserData');
    results.xlsx = saveToExcel(usersData, `${basePath}.xlsx`);
  }

  if (formats.includes('csv')) {
    results.csv = exportToCSV(usersData, `${basePath}.csv`);
  }

  if (formats.includes('json')) {
    results.json = exportToJSON(usersData, `${basePath}.json`);
  }

  logger.info(`Dados exportados para ${formats.length} formato(s)`, { formats, results });
  return results;
}
