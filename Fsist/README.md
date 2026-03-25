# Fsist

Automacao em Node.js + Playwright para consultar notas no FSist e baixar XMLs a partir de uma planilha local com chaves de NFe.

## Estrutura

- `automation-com-perfil.js`: fluxo principal
- `FSIST/fsist.py`: script auxiliar legado
- `downloads-xml/`: XMLs baixados localmente
- `chrome-debug-profile/`: perfil/local de debug do Chrome

## Setup

```bash
npm install
```

## Execucao

Modo recomendado no Windows:

```bat
baixar-notas-fsist.bat
```

Ou manualmente:

```bash
npm run automation
node automation-com-perfil.js caminho/planilha.xlsx
```

## Dados locais

- a planilha de chaves deve permanecer local
- logs, checkpoints e resultados gerados em `FSIST/` nao devem ser versionados
- XMLs baixados ficam em `downloads-xml/`
