# Guia de testes

Este documento descreve o fluxo de validacao do projeto no estado atual.

## Tipos de teste

### Estrutura minima

```bash
npm run test:unit
```

ou

```bash
node scripts/test-unitario.js
```

Valida:

- arquivos principais em `src/`
- estrutura de diretorios
- `package.json`
- `.env.example`

### Testes unitarios de funcao

```bash
npm run test:functions
```

Executa a suite em `tests/unit`.

### Validacao de sintaxe e tipagem

```bash
scripts\testar-sintaxe.bat
```

Valida:

- `tsc --noEmit`
- sintaxe de `src/renderer/renderer.js`
- presenca das dependencias instaladas

### Checagem rapida de ambiente

```bash
scripts\testar-projeto.bat
```

### Testes end-to-end

```bash
npm test
```

Para um teste especifico:

```bash
npm test -- tests/usuario-permissoes-loop.spec.js
```

Esses testes exigem `.env` configurado com credenciais validas.

## Fluxo recomendado

Antes de subir mudancas:

1. rode `npm run typecheck`
2. rode `npm run test:unit`
3. rode `npm run test:functions`
4. rode `scripts\testar-sintaxe.bat`

Antes de validar a automacao completa:

1. copie `.env.example` para `.env`
2. preencha as credenciais
3. rode `npm test`

## Referencias

- [README principal](../README.md)
- [Guia dos scripts BAT](README-BAT.md)
