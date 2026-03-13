# Mapeamento das Tabelas do Banco de Dados Domínio

Este documento mapeia as tabelas disponíveis no banco de dados Domínio, categorizadas por prefixo e propósito. Baseado em consultas ao `SYS.SYSTABLE`, inclui descrições (`remarks`) para facilitar o uso em automações, dashboards e scripts.

## Acesso ao Banco
- **DSN ODBC**: `Contabil`
- **Usuário**: `EXTERNO`
- **Senha**: `externo`
- **Biblioteca**: `pyodbc` em Python
- **Ferramenta de Exploração**: `Busca Tabelas` (disponível em `ftpdownload.dominiosistemas.com.br/Relatorios/Tecnica/BuscaTabelas.zip`)

## Categorias de Tabelas

### EF* (Escrituração Fiscal - Fiscal)
Tabelas relacionadas a impostos, notas fiscais, produtos, fornecedores e afins.

- `efestados`: Estados - Cadastro
- `efgrupopdi`: Grupos de Produtos - Cadastro
- `efmovacu`: Outros Movimentos - Impostos Calculados
- `efmovaju`: Outros Movimentos - Impostos Lançados
- `efmunici`: Municípios - Cadastro
- `efnatureza`: Naturezas - Cadastro
- `efsdoimp`: Saldo dos Impostos
- `efindices`: Índices Diários - Cadastro
- `efindmed`: Índices Médios - Cadastro
- `efajustes`: Ajustes - Cadastro
- `efcomptab`: Compartilhamento de Tabelas
- `efdespesas`: Despesas - Cadastro
- `efespecies`: Espécies - Cadastro
- `efprodutos`: Produtos - Cadastro
- `eftabelas`: Incentivos - Cadastro
- `efclientes`: Clientes - Cadastro
- `efentradas`: Notas Fiscais de Entrada
- `effornece`: Fornecedores - Cadastro
- `geimposto`: Impostos
- `efsaidas`: Notas Fiscais de Saída
- `efservicos`: Notas Fiscais de Serviço
- `efimpent`: Notas Fiscais de Entrada - Impostos
- `efimpsai`: Notas Fiscais de Saída - Impostos
- `efimpser`: Notas Fiscais de Serviço - Impostos
- `efmovdes`: Outros Movimentos - Despesas
- `efmvepro`: Notas Fiscais de Entrada - Produtos
- `efmvspro`: Notas Fiscais de Saída - Produtos
- `efsdopro`: Saldo dos Produtos
- `eftabfax`: Incentivos - Cadastro - Faixas
- `eflivros`: Livros
- `efsemmov`: Períodos Sem Movimentos - Tem que ser alimentada pelo relatório que for usar
- `eftabacu`: Detalhamento de Acumuladores para a GIA Mod. 2 do RS
- `eftabaju`: Outros Movimentos - Impostos Lançados - Detalhamento de Ajustes - RS
- `eftabecf`: Benefícios Fiscais - Cadastro - RS
- `efdespcta`: Despesas - Cadastro - Contas Contábeis
- `efmaqecf`: Máquinas ECF
- `eftabecfm`: Notas Fiscais de Saída/Serviço - ECF
- `eftabecfa`: Notas Fiscais de Saída/Serviço - ECF - Situações Tributárias

### GE* (Geral - General)
Tabelas gerais do sistema, empresas, usuários e afins.

- `gegrupoemp`: Grupo de Empresas
- `geusuarios`: geusuarios
- `geprop`: Proprietário
- `geempre`: Empresa - Cadastro
- `geimposto`: Impostos
- `GECAPITAL`: Capital Social
- `gesocios_temp`: Empresa - Cadastro - Sócios da Empresa
- `GEEMPPAI`: Empresa Pai
- `GeContador`: Empresa - Cadastro - Contadores
- `geinicial`: Dados de configurações iniciais do sistema
- `gerelatorios`: gerelatorios
- `geauxiliar`: geauxiliar

### AT* (Auxiliar/Tabelas - Auxiliary/Tables)
Tabelas auxiliares para cálculos, feriados e afins.

- `atferiados`: Feriados - Cadastro
- `attabclasses`: Tabela para ser usada no cálculo do INSS dos Contribuintes Individuais
- `attabinss`: SELIC - Cadastro
- `attab13`: INSS - Cadastro - 13o. Salário
- `attabfgts`: Tabela do FGTS
- `atmovimp`: Movimentação dos Impostos em atraso

### HO* (Honorários - Fees)
Tabelas para gestão de honorários, clientes e pagamentos.

- `hoclacli`: Classificações de Clientes
- `hoparmto`: Parâmetros do Honorários
- `hofornec`: Fornecedores do Honorários
- `hocontas`: Contas do Honorários
- `hoeventos`: Eventos dos Honorários
- `hopgcont`: Pagamentos
- `homvtconta`: Movimentação da Conta
- `honotas`: Notas do Honorários
- `hoitens`: Itens da Nota do Honorários
- `hopagtos`: Pagamentos dos Clientes do escritório, é igual a recebimentos
- `hovari`: hovari
- `homvpgcont`: Pagamento de Duplicatas

### PR* (Profissionais/Funcionários - Professionals/Employees)
Tabelas para funcionários e clientes eventuais.

- `prFuncionarios`: Funcionários - Cadastro
- `prCliEve`: Clientes Eventuais - Cadastro
- `prItens`: Itens - Cadastro
- `prMovtoDocto`: Movimento de documentos
- `prMovitens`: Movimento de documentos - Itens

### AU* (Auditoria - Audit)
Tabelas para controle de auditoria e logs do sistema.

- `aucolunas`: Comentário das colunas auditadas
- `aucolunasexclusao`: Colunas gravadas na exclusão
- `aucolunaslivres`: Colunas que não são auditadas
- `aucontrole`: Controle do sequencial
- `audados`: Movimentos da auditoria
- `auexcluida`: Períodos de auditorias excluídas
- `aufiltroempresas`: Empresas auditadas - filtro
- `aufiltrotabelas`: Tabelas auditadas - filtro
- `aufiltrousuarios`: Usuários auditados - filtro

- `prFuncionarios`: Funcionários - Cadastro
- `prCliEve`: Clientes Eventuais - Cadastro
- `prItens`: Itens - Cadastro
- `prMovtoDocto`: Movimento de documentos
- `prMovitens`: Movimento de documentos - Itens

### PA* (Patrimonial - Patrimonial)
Tabelas para patrimônio, bens e contas.

- `pabens`: Bens - Cadastro
- `pacontas`: Contas patrimoniais - Cadastro
- `pabasicm`: CIAP - Valores do ICMS
- `pacalmes`: Cálculo Mensal do Patrimônio
- `padadfat`: Dados do Faturamento inf. no Cálculo Mensal do Patrimônio
- `pagrucon`: Grupos Contábeis - Cadastro
- `pamovbem`: Movimentação de Bens
- `paparmto`: Parâmetros
- `pactacc`: Não usada no Gerador

### CT* (Contábil - Accounting)
Tabelas contábeis, lançamentos e centros de custo.

- `ctccusto`: Cadastro - Cadastro de centro de custos da contabilidade
- `ctcontas`: Contas Contábeis - Cadastro
- `cthispad`: Históricos Padrões - Cadastro
- `ctlancto`: Lançamentos Contábeis
- `ctparmto`: Parâmetros
- `ctdepto`: Departamentos - Cadastro
- `ctbaklan`: Lançamentos Eliminados
- `ctalterlan`: Alterações de Lançamentos
- `ctindices`: Coeficiente de Análise
- `CtGruposDre`: Estrutura DRE
- `ctgruposbde`: Estrutura Balanço Demonstração
- `ctgruposdlpa`: Estrutura do DLPA
- `ctgruposdoar`: Estrutura DOAR

### US* (Usuários - Users)
Tabelas para configurações de usuários.

- `usConfUsuario`: usConfUsuario
- `usConfMenu`: Permissões dos usuários para menus do sistema
- `usConfEmpresas`: Permissões de acesso das empresas aos módulos

### LA* (Laudos - Reports)
Tabelas para laudos fiscais.

- `lacsadex`: Adições e Exclusões da CS - Cadastro
- `lairadex`: Adições e Exclusões do IR - Cadastro

## Exemplos de Uso
- **Listar funcionários**: `SELECT * FROM prFuncionarios`
- **Notas fiscais de saída**: `SELECT * FROM efsaidas WHERE CODEMP = 1`
- **Lançamentos contábeis**: `SELECT * FROM ctlancto`

## Campos Comuns
- `CODEMP`: Código da empresa
- `DATA`: Datas
- `VALOR`: Valores monetários

Para mais detalhes, use a ferramenta `Busca Tabelas` ou consulte a documentação do Domínio.

## Folha > Processos > Pagamentos > Encargos

O arquivo `map_folha_pagamentos_encargos.py` consolida o levantamento da tela de Encargos do módulo Folha e valida o caso de referência usado no mapeamento.

Mapeamento principal:
- `FOGUIAINSS` + `FOCALCIRRF`: linha `Tributos federais`
- `FOFGTSFILIAL`: linha `FGTS`
- `FOGUIAGRFC`: linhas `FGTS Rescisão` e `FGTS Resc. Complementar`
- `FORESCISOES`: apoio para validar casos complementares de FGTS rescisório
- `FOPAGTO`, `FOPAGTOPARCIAL` e `FOPARCELAMENTO_ENCARGOS_PAGAMENTOS_ITENS_PARCELAS`: contexto de pagamento, pagamento parcial e parcelamento via `I_PAGTO`

Observações:
- `EFPAGIMP*` pertence ao fluxo fiscal e não alimenta essa tela de Folha.
- `FOPAGTO_IMPORTACAO` tem estrutura parecida, mas está vazia na base validada.

Exemplo de uso:

```powershell
.\.venv\Scripts\python.exe .\map_folha_pagamentos_encargos.py --validate-reference-case
```

Caso queira consultar outra empresa:

```powershell
.\.venv\Scripts\python.exe .\map_folha_pagamentos_encargos.py --empresa 163 --filial 1 --competencia 2026-02 --vencimento 2026-03-20
```
