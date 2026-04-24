# Deploy Desktop Windows

## Objetivo

Gerar um instalador `.exe` para Windows da aplicacao desktop SIEG XML, sem dependencias de navegador e sem exigir Python na maquina de destino.

## Pre-requisitos

- Windows com Python 3.10+ disponivel para o processo de build
- Inno Setup 6 instalado
- Arquivo de configuracao de maquina pronto em `packaging/windows/config/.env`

Conteudo minimo do arquivo:

```env
SIEG_API_KEY=sua_chave
```

## Build

Na raiz do projeto:

```powershell
.\packaging\windows\build.ps1
```

O script:

1. valida a existencia do arquivo de configuracao pre-carregado
2. instala dependencias de build
3. gera o bundle PyInstaller em `dist\SIEG XML\`
4. gera o instalador Inno Setup em `installer\`

## Instalacao no cliente

O instalador:

- copia a aplicacao para `Program Files\SIEG XML\`
- cria atalhos no menu Iniciar e opcionalmente na area de trabalho
- copia a configuracao para `%ProgramData%\SIEG XML\config\.env`

## Runtime

Arquivos operacionais padrao:

```text
%ProgramData%\SIEG XML\
  config\.env
  data\
    logs\
    reports\
    uploads\
    work\
    xmls\
```

Os XMLs baixados vao para a pasta escolhida pelo usuario em cada execucao.

## Validacao recomendada

- Abrir o executavel instalado
- Validar entrada por arquivo
- Validar entrada por colagem manual
- Escolher pasta de destino vazia
- Executar download real ou simulado
- Validar reorganizacao de uma pasta existente
- Confirmar abertura da pasta final
