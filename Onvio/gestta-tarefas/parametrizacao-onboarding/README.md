# parametrizacao-onboarding

Aplicativo local em Electron/TypeScript para parametrizar tarefas de onboarding no Gestta a partir da matriz `PLANILHA GERAL DE TAREFAS POR REGIME E SETOR.xlsx`.

## Aplicativo instalavel

Gerar instalador Windows:

```bash
bun install
bun run --cwd Onvio/gestta-tarefas/parametrizacao-onboarding dist:win
```

O instalador NSIS fica em `Onvio/gestta-tarefas/parametrizacao-onboarding/release/`.

O app instalado nao exige Node, Bun ou o repositorio na maquina do usuario. A matriz padrao e empacotada junto com o aplicativo, e os relatorios sao salvos em:

```text
Documentos/Parametrizacao Onboarding Gestta/relatorios
```

## Uso pela interface

```bash
bun run --cwd Onvio/gestta-tarefas/parametrizacao-onboarding electron
```

Fluxo principal:

- selecione a planilha ou use a matriz padrao;
- informe e-mail/senha Onvio e faca login pela janela aberta;
- informe CNPJ, regime fiscal, areas e opcoes;
- no DP, escolha o perfil Normal ou Sem movimento, o Grupo 1 ou 2 para a folha normal e os adicionais desejados;
- as tarefas anuais sao sempre incluidas;
- calcule a previa;
- use `Simular sem alterar` para validar no Gestta sem aplicar;
- use `Aplicar parametrizacao` para alterar as tarefas apos confirmacao.

O modo avancado mostra UF e ajustes de rede: timeout, tentativas de leitura e intervalo entre leituras.

## O que faz

- le a matriz por regime/departamento;
- calcula tarefas marcadas com `Sim` na coluna B;
- inclui tarefas com marcador `PLANO PREMIUM` quando `planoPremium` estiver ativo;
- inclui a tarefa de analise de parcelamentos fiscal quando `adicionarAnaliseParcelamentos` estiver ativo;
- resolve empresa por CNPJ, tarefa recorrente ativa por nome e responsavel por nome;
- adiciona a empresa em tarefas ausentes;
- ajusta o responsavel do vinculo quando necessario;
- gera relatorios JSON e XLSX.

O app nao remove vinculos extras, nao chama `task-gen` e nao altera a matriz original.

## Uso por CLI

Entrada JSON:

```json
{
  "cnpj": "11222333000144",
  "areas": ["dp", "fiscal", "contabil"],
  "regimeFiscal": "fiscal_normal",
  "dp": {
    "perfil": "normal",
    "adicionais": ["particularidade"],
    "grupoFolha": "grupo_2"
  },
  "incluirAnuais": true,
  "planoPremium": false,
  "supervisor": false,
  "adicionarAnaliseParcelamentos": true,
  "uf": "SE"
}
```

Dry-run:

```bash
bun run --cwd Onvio/gestta-tarefas/parametrizacao-onboarding build
bun run --cwd Onvio/gestta-tarefas/parametrizacao-onboarding start -- --input-json caminho.json --dry-run
```

Aplicar:

```bash
bun run --cwd Onvio/gestta-tarefas/parametrizacao-onboarding start -- --input-json caminho.json --matrix caminho.xlsx --apply
```

## Configuracao tecnica

- `JWT_GESTTA` ou `GESTTA_JWT_TOKEN`: fallback manual para CLI.
- `ONVIO_AUTH_ARTIFACT_PATH`: caminho opcional do artefato de auth.
- `MATRIX_PATH`: caminho opcional da matriz.
- `GESTTA_HTTP_TIMEOUT_MS`, `GESTTA_READ_RETRIES`, `GESTTA_READ_RETRY_DELAY_MS`: ajustes de rede.

Pela interface instalada, a autenticacao e capturada via janela Electron e salva no diretorio de dados do usuario.

## Testes

```bash
bun run --cwd Onvio/gestta-tarefas/parametrizacao-onboarding build
bun run --cwd Onvio/gestta-tarefas/parametrizacao-onboarding test
```
