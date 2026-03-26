# Scripts BAT

Guia operacional dos scripts Windows do app.

## Scripts disponiveis

### `scripts/instalar-dependencias.bat`

Prepara o ambiente local:

- executa `npm install`
- instala os navegadores do Playwright

### `scripts/iniciar-interface.bat`

Compila o projeto e abre a interface Electron.

Use quando quiser operar o app pela UI.

### `scripts/executar-automacao.bat`

Executa a automacao por linha de comando com entrada interativa.

### `scripts/executar-com-config.bat`

Executa a automacao usando os dados do arquivo `.env`.

Fluxo recomendado:

```txt
copy .env.example .env
```

Depois preencha:

```txt
ONVIO_EMAIL=usuario@exemplo.com
ONVIO_PASSWORD=sua-senha
ONVIO_CLIENT_ID=467
ONVIO_MFA_METHOD=E-mail
ONVIO_MFA_CODE=
```

### `scripts/testar-projeto.bat`

Executa uma checagem rapida do ambiente e da estrutura do projeto.

### `scripts/testar-sintaxe.bat`

Valida:

- TypeScript com `tsc --noEmit`
- sintaxe de `src/renderer/renderer.js`
- presenca de `node_modules`

## Uso recomendado

Primeira configuracao:

1. rode `scripts\instalar-dependencias.bat`
2. copie `.env.example` para `.env`
3. use `scripts\iniciar-interface.bat` ou `scripts\executar-com-config.bat`

## Seguranca

- `.env` e local e nao deve ser commitado
- `dist/`, logs, relatorios e demais artefatos locais tambem ficam fora do versionamento

## Referencia

- `README.md` para setup do projeto
- `docs/README-TESTES.md` para validacao
