import { Page, Locator } from '@playwright/test';
import { logger } from './logger';
import { UserListItem } from '../types';

/**
 * Lista todos os usuários de cliente na página atual
 * @param page - Página do Playwright
 * @returns Lista de objetos com informações dos usuários {id, nome, email, editButton}
 */
export async function listAllUsers(page: Page): Promise<UserListItem[]> {
  const users: UserListItem[] = [];
  
  try {
    logger.progress('Listando todos os usuários de cliente...');
    
    // Aguardar grid de usuários carregar
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Tentar múltiplos métodos para encontrar o grid
    let grid: Locator | null = null;
    let rows: Locator[] = [];
    
    // Método 1: Tentar encontrar grid usando getByRole
    try {
      const grids = await page.getByRole('grid').all();
      if (grids.length > 0) {
        grid = grids[0];
        rows = await grid.getByRole('row').all();
        logger.debug(`Método 1: Encontradas ${rows.length} linhas usando getByRole('grid')`, { method: 1, rows: rows.length });
      }
    } catch (e) {
      logger.warn('Método 1 falhou', { error: (e as Error).message, method: 1 });
    }
    
    // Método 2: Tentar encontrar por testId ou classe
    if (rows.length === 0) {
      try {
        grid = page.locator('on-grid, .bento-grid, [role="grid"], table').first();
        await grid.waitFor({ state: 'visible', timeout: 5000 });
        rows = await grid.locator('tr, [role="row"]').all();
        logger.debug(`Método 2: Encontradas ${rows.length} linhas usando locator`, { method: 2, rows: rows.length });
      } catch (e) {
        logger.warn('Método 2 falhou', { error: (e as Error).message, method: 2 });
      }
    }
    
    // Método 3: Procurar por botões de editar diretamente (método mais confiável)
    try {
      // Aguardar um pouco mais para garantir que a página carregou
      await page.waitForTimeout(2000);
      
      const editButtons = await page.locator('.bento-icon-edit').all();
      logger.debug(`Método 3: Encontrados ${editButtons.length} botões de editar (.bento-icon-edit)`, { method: 3, buttons: editButtons.length });
      
      if (editButtons.length === 0) {
        // Tentar outros seletores
        const altButtons = await page.locator('button[aria-label*="Editar"], button[aria-label*="Edit"], [data-testid*="edit"]').all();
        logger.debug(`Método 3b: Encontrados ${altButtons.length} botões alternativos`, { method: '3b', buttons: altButtons.length });
        editButtons.push(...altButtons);
      }
      
      for (let i = 0; i < editButtons.length; i++) {
        const button = editButtons[i];
        try {
          // Verificar se o botão está visível
          const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (isVisible) {
            // Método mais direto: usar data-testid específico da linha
            let nome = '';
            let email = '';
            let id = '';
            
            // Tentar encontrar usando data-testid específico da linha (col-name-row-0, col-name-row-1, etc.)
            try {
              // Tentar com o índice direto
              const nameCell = page.locator(`[data-testid="col-name-row-${i}"]`).first();
              if (await nameCell.isVisible({ timeout: 1000 }).catch(() => false)) {
                nome = (await nameCell.textContent().catch(() => '') || '').trim();
              }
              
              const emailCell = page.locator(`[data-testid="col-email-row-${i}"]`).first();
              if (await emailCell.isVisible({ timeout: 1000 }).catch(() => false)) {
                email = (await emailCell.textContent().catch(() => '') || '').trim();
              }
              
              // Se não encontrou, tentar com índice + 1 (pode haver header row)
              if (!nome || !email) {
                const nameCellAlt = page.locator(`[data-testid="col-name-row-${i + 1}"]`).first();
                if (await nameCellAlt.isVisible({ timeout: 500 }).catch(() => false)) {
                  nome = (await nameCellAlt.textContent().catch(() => '') || '').trim();
                }
                
                const emailCellAlt = page.locator(`[data-testid="col-email-row-${i + 1}"]`).first();
                if (await emailCellAlt.isVisible({ timeout: 500 }).catch(() => false)) {
                  email = (await emailCellAlt.textContent().catch(() => '') || '').trim();
                }
              }
            } catch (e) {
              // Continuar com método alternativo
            }
            
            // Se não encontrou pelos data-testid específicos, tentar encontrar pela linha do botão
            let row: Locator | null = null;
            if (!nome || !email) {
              // Tentar encontrar a linha pai do botão
              try {
                row = button.locator('xpath=ancestor::tr | ancestor::div[@role="row"] | ancestor::*[contains(@class, "row")]').first();
                const rowVisible = await row.isVisible({ timeout: 500 }).catch(() => false);
                if (!rowVisible) {
                  row = null;
                }
              } catch (e) {
                // Continuar sem linha
                row = null;
              }
              
              if (row) {
                // Tentar usar data-testid genérico na linha
                try {
                  const nameCell = row.locator('[data-testid^="col-name-row-"]').first();
                  if (await nameCell.isVisible({ timeout: 500 }).catch(() => false)) {
                    nome = (await nameCell.textContent().catch(() => '') || '').trim();
                  }
                  
                  const emailCell = row.locator('[data-testid^="col-email-row-"]').first();
                  if (await emailCell.isVisible({ timeout: 500 }).catch(() => false)) {
                    email = (await emailCell.textContent().catch(() => '') || '').trim();
                  }
                } catch (e) {
                  // Continuar com método alternativo
                }
                
                // Método 2: Se não encontrou pelos data-testid, tentar células normais
                if (!nome || !email) {
                  const cells = await row.locator('td, [role="gridcell"]').all();
                  
                  if (cells.length > 0) {
                    // Tentar extrair nome das primeiras células
                    for (let j = 0; j < Math.min(4, cells.length); j++) {
                      const text = await cells[j]?.textContent().catch(() => '') || '';
                      const trimmed = text.trim();
                      
                      // Nome geralmente não contém @ e não é só número
                      if (trimmed && !nome && !trimmed.includes('@') && !/^\d+$/.test(trimmed) && trimmed.length > 2) {
                        nome = trimmed;
                      }
                      // Email contém @
                      if (trimmed.includes('@') && !email) {
                        email = trimmed;
                      }
                      // ID é só número
                      if (/^\d+$/.test(trimmed) && !id) {
                        id = trimmed;
                      }
                    }
                  }
                }
              }
            }
            
            const userItem: UserListItem = {
              index: i,
              name: nome.trim(), // Campo 'name' para compatibilidade
              nome: nome.trim(),
              email: email.trim(),
              id: id.trim(),
              editButton: button
            };
            
            if (row) {
              userItem.row = row;
            }
            
            users.push(userItem);
            
            logger.success(`Usuário ${i + 1}: ${nome || email || id || 'Sem identificação'}`, { 
              index: i + 1, 
              nome: nome || null, 
              email: email || null, 
              id: id || null 
            });
          }
        } catch (e) {
          // Continuar com próximo botão
          continue;
        }
      }
      
      // Se encontrou usuários pelo método 3, retornar
      if (users.length > 0) {
        logger.success(`${users.length} usuário(s) encontrado(s) pelo método 3 (botões de editar)`, { 
          count: users.length, 
          method: 3 
        });
        return users;
      }
    } catch (e) {
      logger.warn('Método 3 falhou', { error: (e as Error).message, method: 3 });
    }
    
    logger.debug(`Encontradas ${rows.length} linhas no grid`, { rows: rows.length });
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Pular cabeçalho
        const header = await row.locator('[role="columnheader"], th').count();
        if (header > 0) continue;
        
        // Tentar extrair informações da linha
        const cells = await row.locator('td, [role="gridcell"]').all();
        
        if (cells.length > 0) {
          // Tentar extrair nome (geralmente primeira ou segunda coluna)
          let nome = '';
          let email = '';
          let id = '';
          
          // Nome geralmente está em uma das primeiras colunas
          if (cells[0]) {
            nome = await cells[0].textContent().catch(() => '') || '';
          }
          if (cells[1] && !nome) {
            nome = await cells[1].textContent().catch(() => '') || '';
          }
          
          // Email pode estar em outra coluna
          for (const cell of cells) {
            const text = await cell.textContent().catch(() => '') || '';
            if (text.includes('@') && !email) {
              email = text.trim();
            }
            // Tentar encontrar ID numérico
            if (/^\d+$/.test(text.trim()) && !id) {
              id = text.trim();
            }
          }
          
          // Encontrar botão de editar na linha
          const editButton = row.locator('.bento-icon-edit, button[aria-label*="Editar"], button[aria-label*="Edit"]').first();
          const hasEditButton = await editButton.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (nome || email || hasEditButton) {
            users.push({
              index: i,
              nome: nome.trim(),
              email: email.trim(),
              id: id.trim(),
              editButton: editButton,
              row: row
            });
            
            logger.success(`Usuário ${i + 1}: ${nome || email || 'Sem nome'}`, { 
              index: i + 1, 
              nome: nome || null, 
              email: email || null 
            });
          }
        }
      } catch (e) {
        // Continuar com próxima linha
        continue;
      }
    }
    
    logger.success(`${users.length} usuário(s) encontrado(s) na lista`, { count: users.length });
    
  } catch (error) {
    logger.error('Erro ao listar usuários', error as Error, { function: 'listAllUsers' });
    // Tentar método alternativo usando getByRole
    try {
      const rows = await page.getByRole('row').all();
      for (const row of rows) {
        const header = await row.locator('[role="columnheader"]').count();
        if (header === 0) {
          const editButton = row.locator('button').filter({ hasText: /Editar|Edit/i }).first();
          if (await editButton.isVisible({ timeout: 500 }).catch(() => false)) {
            users.push({
              index: users.length,
              editButton: editButton,
              row: row
            });
          }
        }
      }
      logger.success(`${users.length} usuário(s) encontrado(s) (método alternativo)`, { 
        count: users.length, 
        method: 'alternativo' 
      });
    } catch (e2) {
      logger.error('Erro no método alternativo', e2 as Error, { function: 'listAllUsers', method: 'alternativo' });
    }
  }
  
  return users;
}
