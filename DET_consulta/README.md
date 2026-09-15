# Consulta automatizada do DTE

CLI em TypeScript/Bun que usa certificado digital para:

1. autenticar no Sistema de Procuração Eletrônica (SPE);
2. carregar todas as procurações recebidas pela empresa procuradora;
3. validar o serviço `DET0003` no Domicílio Eletrônico Trabalhista;
4. consultar a caixa postal e o total de mensagens não lidas;
5. exportar JSON, CSV e XLSX.

A automação somente consulta dados. Ela não abre mensagens individualmente, não altera seu estado, não baixa anexos e não modifica procurações.

## Requisitos

- Windows com Node.js 22, Bun 1.3 e Google Chrome instalados;
- certificado e-CNPJ em arquivo PFX/P12;
- procurações válidas no SPE com poderes para o DTE.

## Configuração

Copie `.env.example` para `.env` e preencha:

```dotenv
CERT_PFX_PATH=./certificado.pfx
CERT_PASSWORD=senha-do-certificado
PROCURADOR_CNPJ=00000000000000
```

Variáveis opcionais:

```dotenv
OUTPUT_DIR=output
CAPTCHA_TIMEOUT_MS=300000
REQUEST_DELAY_MS=250
BROWSER_MODE=cdp
```

O `.env`, certificados, HARs, relatórios e sessões de navegador estão fora do versionamento. Nunca armazene cookies ou JWTs no arquivo de ambiente.

## Instalação e execução

```powershell
bun install
bun run build
bun test
bun run start
```

O Google Chrome instalado será aberto visivelmente em um perfil temporário, conectado pelo modo CDP. Esse modo mantém o navegador comum para o hCaptcha e utiliza o certificado já instalado no repositório pessoal do Windows; o perfil temporário é removido ao final. Se o Gov.br ou o Cloudflare apresentar um desafio, conclua-o na janela dentro do tempo configurado. A aplicação selecionará o perfil PJ correspondente a `PROCURADOR_CNPJ` e continuará automaticamente.

Como fallback técnico, `BROWSER_MODE=playwright` usa o PFX diretamente no contexto do Playwright, mas o Gov.br pode recusar seu hCaptcha invisível com `ERL0033000`. O Bun gerencia dependências e testes; a CLI compilada roda em Node devido à maior estabilidade do canal de controle no Windows.

## Saída

Cada execução cria uma pasta `output/AAAA-MM-DD_HH-mm-ss/` com:

- `execucao.json`: resultado canônico e contadores;
- `empresas.csv`: situação e prioridades consolidadas de cada CNPJ;
- `mensagens.csv`: mensagens com texto limpo, resumo, classificação, ciência e HTML original;
- `mensagens_nao_lidas.csv`: mensagens que ainda não foram abertas manualmente;
- `fila_acao.csv`: itens operacionais, altos ou críticos cuja providência precisa ser confirmada;
- `falhas.csv`: falhas e empresas sem autorização;
- `relatorio.xlsx`: painel e abas Fila de Ação, Não Lidas, Empresas, Mensagens, Falhas e Regras;
- `run.log`: log sanitizado, sem senhas, cookies, JWTs, CPF ou texto das mensagens.

O HTML retornado pelo DTE é preservado no JSON/CSV e em uma coluna oculta do XLSX. A coluna `TEXTO_LIMPO` converte parágrafos, listas, tabelas, links e entidades HTML para leitura humana sem executar o conteúdo. A prioridade é uma triagem explicável; `STATUS_ACAO=a_confirmar` não afirma que a obrigação continua pendente.

Para melhorar uma coleta antiga sem acessar novamente o DTE, informe a pasta de origem. Uma nova pasta com o sufixo `_melhorado` será criada e a coleta original permanecerá intacta:

```powershell
bun run report:enhance -- output/AAAA-MM-DD_HH-mm-ss
```

Os códigos de saída são `0` para sucesso integral, `2` para resultado parcial e `1` para falha fatal.

## Teste real limitado

O teste live fica desativado por padrão e limita a execução a uma empresa:

```powershell
$env:RUN_LIVE = "1"
bun run test:live
```

O teste real usa exclusivamente o PFX e as variáveis locais. Tokens copiados do DevTools ou de comandos `curl` nunca são reutilizados.
