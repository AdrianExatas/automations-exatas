# Parcelamentos SEFAZ (App Desktop)

Aplicativo Windows para baixar parcelamentos das SEFAZ de **Alagoas (AL)**, **Piaui (PI)** e **Sergipe (SE)**.

## Como usar

1. Abra o app e escolha a aba do estado.
2. Clique em **Baixar modelo** (salva em `Documentos\Exatas\Parcelamentos SEFAZ\modelos\`).
3. Preencha a planilha com os dados das empresas.
4. Selecione a planilha no app.
5. Escolha a pasta dos downloads.
6. Clique em **Iniciar Download**.
7. Ao final, use **Abrir Pasta dos Downloads** e **Abrir Relatorio**.

Acesso (usuario/senha/CPF) fica **somente na planilha**, nao na interface.

## Modelos oficiais

Arquivos de referencia em `templates/`.

### AL

| CODIGO | EMPRESA | CNPJ | USUARIO | SENHA | OBSERVAÇÃO |
|--------|---------|------|---------|-------|------------|

### PI

| CODIGO | EMPRESA | CNPJ | INSCRICAO ESTADUAL |
|--------|---------|------|--------------------|

No PI, o app consulta a IE e baixa automaticamente as parcelas vencidas e do mes atual.

### SE

| CODIGO | EMPRESA | CNPJ | INSCRICAO ESTADUAL | CPF | LOCAL PARA SALVAR ARQUIVO |
|--------|---------|------|--------------------|-----|---------------------------|

A pasta escolhida na interface prevalece sobre a coluna de local.

## Requisitos

- Windows 10/11
- Microsoft Edge instalado

## Desenvolvimento

```bash
cd app
npm install
npm run electron:dev
```

## Gerar instalador

```bash
cd app
npm run desktop:dist
```
