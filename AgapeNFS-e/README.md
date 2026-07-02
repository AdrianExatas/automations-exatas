# Agape NFS-e XML

Aplicacao desktop Electron em TypeScript para baixar XML municipal de notas finalizadas no Agape NFS-e.

## Requisitos

- Bun 1.3+
- Windows para empacotamento final com Electron

## Instalar

```powershell
bun install
```

## Executar

```powershell
bun run electron
```

Informe login, senha, data inicial e data final na tela. A pasta destino e opcional; quando vazia, os XMLs sao salvos em:

```text
%USERPROFILE%\Downloads\XML AgapeNFS-e\YYYY-MM\
```

O nome de cada arquivo segue o padrao:

```text
nfse-{numero}_codigo-{codigo}.xml
```

Arquivos existentes sao pulados. O app baixa ate 8 XMLs simultaneamente por pagina e consulta apenas notas com status finalizado.

## Credenciais

As credenciais sao informadas na interface. Se a opcao de salvar estiver marcada, login e senha ficam criptografados com `safeStorage` do Electron no perfil local do usuario. O `.env` nao e necessario para a operacao normal.

## Scripts

```powershell
bun run dev       # build + abre Electron
bun run build     # compila main, preload e renderer em build/
bun run electron  # build + abre Electron
bun run test      # executa testes com bun test
bun run dist      # gera instalador e portatil em dist/
```

## Testes

```powershell
bun run test
```

Os testes cobrem parser JSF/RichFaces, payloads, conversao de datas, limite de conexoes e validacoes principais.

## Legado Python

A implementacao Python anterior foi movida para `_legacy/python/` apenas como referencia temporaria. O fluxo oficial e a versao Bun/TypeScript.
