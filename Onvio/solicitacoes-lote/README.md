# Solicitacoes Onvio

Aplicativo desktop para abrir solicitacoes de servico em lote no Portal do Cliente Onvio.

## O que faz

- Login no Onvio (com MFA na janela do app)
- Leitura de planilha com os campos da solicitacao
- Anexos escolhidos na interface, por linha
- Flag para replicar um arquivo comum a todas as solicitacoes
- Envio via API do Onvio, com checkpoint e relatorio

## Planilha

Colunas do modelo:

- `CNPJ` (obrigatorio)
- `CODIGO` (recomendado)
- `EMPRESA`
- `SOLICITANTE`
- `DEPARTAMENTO`
- `ASSUNTO`
- `DESCRICAO`

Os arquivos nao vao na planilha. Depois de carregar as linhas, use **Anexar** em cada solicitacao. Marque **Replicar proximos anexos para todas as solicitacoes** ou use **Anexar comum** quando o arquivo for o mesmo para o lote.

## Desenvolvimento

```bash
bun install
bun run --cwd shared/onvio-solicitacoes-servico build
bun run --cwd Onvio/solicitacoes-lote test
bun run --cwd Onvio/solicitacoes-lote electron
```

## Instalador Windows

```bash
bun run --cwd Onvio/solicitacoes-lote dist:win
```

O instalador NSIS fica em `Onvio/solicitacoes-lote/release`.

## Requisitos de uso

- Conta Onvio com acesso ao Portal do Cliente
- Codigo do cliente na planilha, para localizar empresa e solicitante
- Departamento preenchido na linha ou no dropdown **Departamento padrao** da tela (lista oficial do Onvio apos o login)
