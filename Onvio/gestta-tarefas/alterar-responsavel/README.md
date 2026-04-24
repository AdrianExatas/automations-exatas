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

## Formato da planilha

Colunas esperadas:

- `COD.`
- `CNPJ`
- `RESPONSAVEL`
- `MES GERACAO` (mantida por compatibilidade, nao e usada para executar a alteracao)
- `SETOR` opcional

## Observacoes

- falhas por empresa nao interrompem o restante da execucao
- a automacao nao exclui nem gera tarefas; apenas altera o responsavel quando encontra `group_customer`
- se usar `JWT_GESTTA` ou `GESTTA_JWT_TOKEN` no `.env`, a renovacao continua manual e externa a este projeto
- `../_local/.env` continua existindo por compatibilidade, mas nao deve mais bloquear o uso do artefato renovado
- os relatorios ficam em `relatorios/`
- detalhes sobre a API local e lacunas do Gestta estao em [../docs/uso-api-3001-e-lacunas-gestta.md](../docs/uso-api-3001-e-lacunas-gestta.md)

## Troubleshooting

- `401` ou `403` usando artefato: a automacao tenta refresh automatico uma vez; se ainda falhar, rode `bun run --cwd shared/onvio-auth capture-tokens` manualmente e execute novamente
- mensagem sobre falha ao renovar token automaticamente: confira `ONVIO_EMAIL`, `ONVIO_PASSWORD` e MFA no ambiente do processo
- se o projeto cair no fallback legado de `../_local/.env`, considere renovar ou remover esse JWT antigo
- uso de JWT fixo no `.env`: a troca do token e manual; nao ha refresh automatico nesse modo
