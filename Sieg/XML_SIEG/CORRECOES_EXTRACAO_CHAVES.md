# Correções na Automação SIEG - Extrair Chaves de Acesso

## Problemas Identificados e Corrigidos

### 1. Perda de Precisão com Números Grandes
**Problema:** Quando o pandas lê números de 44 dígitos do Excel, ele pode convertê-los para float, causando perda de precisão. Números de 44 dígitos não podem ser representados com precisão como float em Python (limite de ~15-17 dígitos significativos).

**Solução:** 
- Forçar leitura como string (`dtype=str`) desde o início
- Se não for possível, converter todas as colunas para string após a leitura
- Melhorar a função `_converter_valor_para_texto` para detectar e rejeitar valores que perderam precisão

### 2. Melhor Tratamento de Notação Científica
**Problema:** Números grandes podem ser exibidos em notação científica (ex: 2.82512e+43), o que impede a extração correta das chaves.

**Solução:**
- Detectar valores em notação científica e rejeitá-los (pois já perderam precisão)
- Melhorar a conversão de valores numéricos para string

### 3. Melhor Tratamento de Erros
**Problema:** Erros não eram reportados adequadamente, dificultando o diagnóstico.

**Solução:**
- Adicionar traceback completo nos erros
- Tentar múltiplos métodos de leitura (openpyxl, xlrd)
- Melhorar mensagens de erro e avisos

### 4. Suporte a Múltiplos Formatos
**Problema:** Script só processava arquivos .xlsx

**Solução:**
- Adicionar suporte para arquivos .xls antigos
- Adicionar suporte para arquivos .txt (uma chave por linha ou chaves em qualquer lugar do texto)
- Tentar diferentes engines de leitura
- Função genérica `processar_arquivo()` que detecta automaticamente o tipo de arquivo

### 5. Validação Mais Robusta
**Problema:** Regex poderia capturar números que não são chaves válidas

**Solução:**
- Usar lookahead/lookbehind no regex para garantir que não há mais dígitos adjacentes
- Validação adicional garantindo que são exatamente 44 dígitos
- Remover espaços e caracteres especiais antes da extração

## Arquivos Modificados

1. `src/sieg_xml/core/chave_extractor.py`
   - Função `extrair_chaves_xml()`: Melhorada com regex mais robusto
   - Função `_converter_valor_para_texto()`: Nova função para tratar conversão de valores
   - Função `processar_planilha()`: Melhor tratamento de erros e múltiplos métodos de leitura
   - Função `processar_arquivo_texto()`: Nova função para processar arquivos .txt
   - Função `processar_arquivo()`: Função genérica que detecta automaticamente o tipo de arquivo

2. `scripts/extrair_chaves.py`
   - Melhor tratamento de erros ao processar múltiplos arquivos
   - Suporte para arquivos .xls além de .xlsx
   - Suporte para arquivos .txt
   - Usa função genérica `processar_arquivo()` para detectar tipo automaticamente

3. `src/sieg_xml/utils/ui_utils.py`
   - Funções `selecionar_planilha()` e `selecionar_multiplas_planilhas()` atualizadas para incluir arquivos .txt

## Como Testar

1. Execute o script:
   ```bash
   python scripts/extrair_chaves.py
   ```

2. Selecione uma planilha que contenha chaves de acesso de 44 dígitos

3. Verifique se as chaves são extraídas corretamente

## Observações Importantes

- **Números formatados como texto no Excel:** Devem funcionar corretamente agora
- **Números em células numéricas:** Se o Excel salvou como número, pode haver perda de precisão se o número for muito grande. A solução força leitura como string.
- **Planilhas com formatação especial:** O código agora processa todas as células, independente da formatação
- **Arquivos .txt:** Suporta arquivos de texto com uma chave por linha ou chaves em qualquer lugar do texto. Detecta automaticamente a codificação (UTF-8, Latin-1, CP1252, ISO-8859-1)

## Próximos Passos Recomendados

1. Testar com planilhas reais que estavam falhando
2. Se ainda houver problemas, verificar se as planilhas têm formatação especial ou proteção
3. Considerar adicionar opção para processar apenas colunas específicas (se necessário)
