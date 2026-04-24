# Instrucoes para Reprocessar Notas Especificas

## Opcao 1: Reprocessar por nome de arquivo

1. Crie um arquivo de texto, por exemplo `arquivos_reprocessar.txt`, com um nome de arquivo por linha.
2. Execute:

```bash
sieg-xml upload --pasta "O:\EMPRESAS\SUPERMERCADO DORIA BOQUIM LTDA\FISCAL\2025\12\XML" --reprocessar-nomes arquivos_reprocessar.txt --threads 10
```

Atalho opcional:

```text
tools/windows/reprocessar_erros.bat
```

## Opcao 2: Reprocessar por arquivo de chaves

1. Prepare um arquivo como `chaves_reprocessar.txt`, com uma chave por linha.
2. Execute:

```bash
sieg-xml upload --pasta "O:\EMPRESAS\SUPERMERCADO DORIA BOQUIM LTDA\FISCAL\2025\12\XML" --reprocessar-arquivo chaves_reprocessar.txt --threads 10
```

Atalho opcional:

```text
tools/windows/reprocessar_notas.bat
```

## Opcao 3: Informar chaves diretamente

```bash
sieg-xml upload --pasta "O:\EMPRESAS\SUPERMERCADO DORIA BOQUIM LTDA\FISCAL\2025\12\XML" --reprocessar 28251210965766000164651040000231011151350195 28251210965766000164651040000231061151350248 --threads 10
```

## Opcao 4: Forcar envio sem verificacao

```bash
sieg-xml upload --pasta "O:\EMPRESAS\SUPERMERCADO DORIA BOQUIM LTDA\FISCAL\2025\12\XML" --reprocessar-nomes arquivos_reprocessar.txt --sem-verificacao --threads 10
```

## Parametros

- `--pasta`: pasta onde estao os arquivos XML
- `--reprocessar-nomes`: arquivo com um nome de arquivo por linha
- `--reprocessar-arquivo`: arquivo com uma chave por linha
- `--reprocessar`: lista de chaves na linha de comando
- `--threads`: numero de threads
- `--sem-verificacao`: pula a verificacao de XML existente antes do envio
