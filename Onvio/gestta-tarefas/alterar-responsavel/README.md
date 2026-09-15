# alterar-responsavel

Automacao em Node.js/TypeScript para alterar o responsavel de tarefas no Gestta a partir de uma planilha local.

## Pre-requisitos

- Node.js 18+
- um JWT do Gestta em `.env` (`JWT_GESTTA` ou `GESTTA_JWT_TOKEN`) ou acesso ao artefato `shared/onvio-auth/runtime/latest-auth.json`
- planilha local em `../_local/data/DP RESPONSAVEL.xlsx` ou outro caminho informado por argumento/variavel

Se a origem do token for o artefato compartilhado, a automacao tenta renovar o JWT automaticamente quando o artefato estiver ausente/invalido no inicio da execucao e tambem ao receber `401/403` da API Gestta. Se a origem for `.env`, o token continua sendo manual e estatico.

## Configuracao

1. Copie `.env.example` para `.env`.
2. Escolha a origem do JWT do Gestta:
   - preferencial: gere o artefato compartilhado com `shared/onvio-auth`
   - fallback manual: preencha `JWT_GESTTA` ou `GESTTA_JWT_TOKEN` no `.env`
3. Opcionalmente defina `API_3001_URL` para enriquecer a resolucao por CNPJ.
4. Opcionalmente defina `PLANILHA_PATH`.
5. Opcionalmente defina `ONVIO_AUTH_ARTIFACT_PATH` se o JSON de auth estiver fora do caminho padrao.

## Autenticacao / Renovacao do token

Ordem de resolucao atual do JWT:

1. `JWT_GESTTA`
2. `GESTTA_JWT_TOKEN`
3. `shared/onvio-auth/runtime/latest-auth.json` ou o caminho apontado por `ONVIO_AUTH_ARTIFACT_PATH`
4. `../_local/.env` como fallback legado de ultima prioridade

Precedencia real de origem:

1. `.env` local ou variaveis ja definidas no processo
2. artefato compartilhado
3. `../_local/.env` apenas como compatibilidade legada

O caminho operacional recomendado e usar o artefato compartilhado. Se voce optar por esse fluxo, deixe `JWT_GESTTA` e `GESTTA_JWT_TOKEN` vazios no `.env` local para evitar que um token fixo tenha precedencia sobre o artefato.

Comando para renovar o artefato:

```bash
bun run --cwd shared/onvio-auth capture-tokens
```

Pre-requisitos do comando acima:

- `ONVIO_EMAIL`
- `ONVIO_PASSWORD`
- MFA configurado quando aplicavel (`ONVIO_MFA_METHOD`, `ONVIO_MFA_CODE`, `ONVIO_MFA_TIMEOUT_MS`)

Comportamento atual da automacao:

- modo artefato: tenta refresh em pre-execucao se o artefato estiver ausente/invalido
- modo artefato: ao receber `401/403`, roda `capture-tokens`, recarrega o JWT e repete a requisicao uma unica vez
- modo legado: se o artefato falhar e existir `GESTTA_JWT_TOKEN` ou `JWT_GESTTA` em `../_local/.env`, esse JWT e usado apenas como ultimo fallback
- modo `.env`: nao faz refresh automatico; o token continua manual

Runbook recomendado:

- execucao manual/on-demand: rode `capture-tokens` imediatamente antes da automacao para reduzir a chance de refresh no meio da execucao
- execucao agendada: rode `capture-tokens` no inicio do job, antes de chamar `alterar-responsavel`
- se o refresh automatico falhar por falta de credenciais/MFA: rode `capture-tokens` manualmente e execute novamente

Responsabilidades:

- `shared/onvio-auth`: captura e renovacao do artefato
- `alterar-responsavel`: consumo do JWT ja disponivel

Referencia interna: a implementacao segue a mesma ideia ja usada em `Onvio/BD/src/auth/runtime-auth.ts`, adaptada a este projeto.

Padrao da planilha quando nada e informado:

```text
../_local/data/DP RESPONSAVEL.xlsx
```

## Uso

```bash
bun install
bun run --cwd shared/onvio-auth capture-tokens
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel build
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start
```

Interface local em Electron:

```bash
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel electron
```

A interface permite informar e-mail/senha do Onvio, salvar a senha com criptografia do Electron quando disponivel, selecionar a planilha, baixar o modelo padrao e acompanhar os logs da execucao. Execucoes pela interface usam o artefato de auth salvo pelo app e ignoram JWT fixo do `.env`.

## Aplicativo instalavel Windows

Gerar o instalador:

```bash
bun install
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel build:installer
```

O instalador fica em:

```text
Onvio/gestta-tarefas/alterar-responsavel/installer/
```

Requisitos para quem vai usar o aplicativo instalado:

- Windows 10 ou superior, 64 bits
- acesso a internet
- usuario e senha do Onvio com acesso ao Gestta
- permissao para ler a planilha Excel usada na execucao

Fluxo para o operador:

1. Abra **Alterar Responsavel Gestta** pelo atalho.
2. Informe e-mail/senha e clique em **Fazer login**.
3. Conclua login e MFA na janela do Onvio/Gestta que o aplicativo abrir.
4. Selecione a planilha `.xlsx`.
5. Confira a revisao da planilha.
6. Clique em **Executar automacao**.
7. Ao final, use o botao de relatorios para abrir a pasta com JSON/XLSX gerados.

A ultima planilha selecionada fica salva no aplicativo. Ao abrir novamente, ela e restaurada automaticamente com os responsaveis que foram salvos no Excel. Ao usar **Modelo** sobre um arquivo ja existente, escolha **Usar arquivo existente** para preserva-lo; a substituicao pelo modelo padrao agora exige uma confirmacao explicita.

Dados do aplicativo instalado:

- login Gestta capturado: `%APPDATA%/Alterar Responsavel Gestta/auth/latest-auth.json`
- relatorios, checkpoints e reversoes: `%APPDATA%/Alterar Responsavel Gestta/relatorios`
- credenciais salvas: `%APPDATA%/Alterar Responsavel Gestta/credentials.json`
- ultima planilha selecionada: `%APPDATA%/Alterar Responsavel Gestta/sheet-settings.json`

O instalador desta primeira versao nao e assinado digitalmente. O Windows pode exibir aviso de fornecedor desconhecido.

Fluxo recomendado:

1. `bun run --cwd shared/onvio-auth capture-tokens`
2. `bun run --cwd Onvio/gestta-tarefas/alterar-responsavel build`
3. `bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start`

Selecionar a planilha no Explorer do Windows:

```bash
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start:selecionar
```

Executar com caminho explicito:

```bash
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- "C:\\pasta\\minha-planilha.xlsx"
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel dev -- "..\\_local\\data\\DP RESPONSAVEL.xlsx"
```

Reverter uma execucao:

```bash
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --reverter "C:\\pasta\\relatorios\\execucao_2026-05-04_15-55-44.json"
```

A reversao so funciona para relatorios gerados depois da inclusao do snapshot de rollback. Relatorios antigos continuam abrindo, mas nao possuem o responsavel anterior necessario para restaurar com seguranca. Pela interface Electron, use **Reverter execucao** e selecione o JSON do relatorio.

## Formato da planilha

Colunas esperadas:

- `COD.`
- `CNPJ`
- `RESPONSAVEL`
- `MES GERACAO` (mantida por compatibilidade, nao e usada para executar a alteracao)
- `SETOR` obrigatorio

## Observacoes

- falhas por empresa nao interrompem o restante da execucao
- a automacao nao exclui nem gera tarefas; apenas altera o responsavel quando encontra `group_customer`
- se usar `JWT_GESTTA` ou `GESTTA_JWT_TOKEN` no `.env`, a renovacao continua manual e externa a este projeto
- `../_local/.env` continua existindo por compatibilidade, mas nao deve mais bloquear o uso do artefato renovado
- os relatorios ficam em `relatorios/`
- detalhes sobre a API local e lacunas do Gestta estao em [../docs/uso-api-3001-e-lacunas-gestta.md](../docs/uso-api-3001-e-lacunas-gestta.md)

## Reatribuicao do setor Fiscal

Para a planilha de responsabilidades fiscais com as abas `Planilha1` e `BD`, use primeiro o levantamento. Ele consulta somente tarefas dos departamentos `Fiscal` e `Fiscal - Simples Nacional`, cria backup JSON/XLSX em `relatorios/` e **nao executa PATCH**:

```bash
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --levantamento-fiscal "C:\\Users\\Exatas\\Downloads\\Planilha de responsabilidades setor Fiscal.xlsx"
```

Toda tarefa fiscal cujo responsavel atual seja `Joao Flavio` fica fora da alteracao, independentemente do nome. Tarefas cujo nome contenha `parcelamento` ou `emissao de nota` (ignorando acentos e maiusculas) tambem ficam fora da alteracao; se nao estiverem com Joao Flavio, aparecem como pendencia na aba **Excecoes Joao Flavio**.

Depois de revisar o backup JSON gerado e aprovar as linhas de **Alteracoes planejadas**, aplique-o explicitamente:

```bash
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --aplicar-levantamento-fiscal "C:\\...\\backup_reatribuicao_fiscal_YYYY-MM-DD_HH-MM-SS.json" --confirmar
```

Antes de cada PATCH, a aplicacao confere que o vinculo e o responsavel atual ainda correspondem ao backup. Divergencias sao bloqueadas e registradas. O checkpoint permite retomar uma aplicacao interrompida com o mesmo comando.

## Reatribuicao Pessoal — tarefas existentes

Para a planilha bruta de responsabilidades (colunas `COD.`, `RAZAO SOCIAL` e `RESPONSAVEL`), o fluxo Pessoal resolve a empresa pelo codigo Gestta — com razao social como fallback unico — e nao exige CNPJ, setor ou mes de geracao na fonte.

O levantamento inclui todos os vinculos existentes do departamento Pessoal, os vinculos dos modelos normal e VIA WHATSAPP de **VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP)** e somente as instancias `OPEN` de agosto de 2026 desses dois modelos. Nenhuma tarefa e gerada, removida ou regenerada.

```bash
# Gera JSON/XLSX para revisao; nao altera o Gestta.
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --pessoal-preflight "C:\\Users\\Exatas\\Downloads\\Responsabilidade das Empresas.xlsx"

# Aplica exclusivamente uma previa revisada.
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --pessoal-apply "C:\\...\\previa_reatribuicao_pessoal_....json" --confirmar

# Reverte uma execucao quando o estado atual ainda corresponder ao snapshot.
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --pessoal-rollback "C:\\...\\execucao_reatribuicao_pessoal_....json" --confirmar
```

Codigos repetidos com responsaveis diferentes, empresas ambiguas e usuarios nao resolvidos ficam na aba **Pendencias** e nao recebem alteracao. O preflight tambem bloqueia a execucao se nao localizar uma unica variante VIA WHATSAPP do modelo informado.

## Transferencia de tarefas pendentes do Pessoal

Para transferir somente instancias ja geradas e ainda pendentes (`OPEN` ou `IMPEDIMENT`) entre dois usuarios, use uma planilha com `COD.` e `RAZAO SOCIAL`. Tarefas exibidas como atrasadas pelo Gestta continuam com status `OPEN`; `DELAYED` e `REVIEW` nao pertencem ao enum aceito pelo endpoint de busca. O fluxo nao altera vinculos, modelos ou recorrencias.

```bash
# Consulta e cria a previa; nao transfere tarefas.
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --pessoal-pendentes-preflight "C:\...\empresas.xlsx" --origem "Kamilly Vitoria" --destino "Samara Lima"

# Aplica apenas a previa sem pendencias, revalidando cada instancia.
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --pessoal-pendentes-apply "C:\...\previa_reatribuicao_pessoal_pendentes_....json" --confirmar

# Reverte somente itens efetivamente alterados e que ainda estejam no destino.
bun run --cwd Onvio/gestta-tarefas/alterar-responsavel start -- --pessoal-pendentes-rollback "C:\...\execucao_reatribuicao_pessoal_pendentes_....json" --confirmar
```

O preflight exige resolucao unica de todas as empresas e dos usuarios. A aplicacao salva checkpoint, confirma o responsavel apos cada transferencia e executa uma verificacao final em todas as empresas.

## Troubleshooting

- `401` ou `403` usando artefato: a automacao tenta refresh automatico uma vez; se ainda falhar, rode `bun run --cwd shared/onvio-auth capture-tokens` manualmente e execute novamente
- mensagem sobre falha ao renovar token automaticamente: confira `ONVIO_EMAIL`, `ONVIO_PASSWORD` e MFA no ambiente do processo
- se o projeto cair no fallback legado de `../_local/.env`, considere renovar ou remover esse JWT antigo
- uso de JWT fixo no `.env`: a troca do token e manual; nao ha refresh automatico nesse modo
