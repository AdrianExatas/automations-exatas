# Instruções para Reprocessar Notas Específicas

## Opção 1: Reprocessar por Nome de Arquivo (Recomendado para erros)

Se você tem uma lista de arquivos que deram erro (por exemplo, da interface web), use esta opção:

1. Crie um arquivo de texto (ex: `arquivos_reprocessar.txt`) com um nome de arquivo por linha:
   ```
   N_28251256700755000153550010000005911042932648_SE_000001115355936_108618971_procNFe.xml
   N_28251256700755000153550010000005221327143610_SE_000001112257703_108482780_procNFe.xml
   ```

2. Execute o comando:
   ```bash
   python scripts/enviar_xmls.py --pasta "O:\EMPRESAS\SUPERMERCADO DORIA BOQUIM LTDA\FISCAL\2025\12\XML" --reprocessar-nomes arquivos_reprocessar.txt --threads 10
   ```

   Ou simplesmente execute o arquivo batch:
   ```bash
   reprocessar_erros.bat
   ```

## Opção 2: Usar o arquivo de chaves

1. O arquivo `chaves_reprocessar.txt` já contém as chaves das notas que você precisa reprocessar.

2. Execute o comando:

```bash
python scripts/enviar_xmls.py --pasta "O:\EMPRESAS\SUPERMERCADO DORIA BOQUIM LTDA\FISCAL\2025\12\XML" --reprocessar-arquivo chaves_reprocessar.txt --threads 10
```

Ou simplesmente execute o arquivo batch:

```bash
reprocessar_notas.bat
```

## Opção 3: Especificar chaves diretamente na linha de comando

```bash
python scripts/enviar_xmls.py --pasta "O:\EMPRESAS\SUPERMERCADO DORIA BOQUIM LTDA\FISCAL\2025\12\XML" --reprocessar 28251210965766000164651040000231011151350195 28251210965766000164651040000231061151350248 --threads 10
```

## Opção 4: Sem verificar XMLs existentes (forçar envio)

Se você quiser forçar o envio mesmo que os XMLs já existam:

```bash
python scripts/enviar_xmls.py --pasta "O:\EMPRESAS\SUPERMERCADO DORIA BOQUIM LTDA\FISCAL\2025\12\XML" --reprocessar-nomes arquivos_reprocessar.txt --sem-verificacao --threads 10
```

## Parâmetros

- `--pasta` ou `-p`: Pasta onde estão os arquivos XML
- `--reprocessar-nomes` ou `-rn`: Arquivo de texto com um nome de arquivo por linha (ex: `arquivo.xml`)
- `--reprocessar-arquivo` ou `-rf`: Arquivo de texto com uma chave por linha
- `--reprocessar` ou `-r`: Lista de chaves diretamente na linha de comando
- `--threads` ou `-t`: Número de threads (padrão: 20)
- `--sem-verificacao`: Não verifica se XMLs já existem antes de enviar

## O que o script faz

### Ao reprocessar por nome de arquivo (`--reprocessar-nomes`):
1. Busca todos os XMLs na pasta especificada (incluindo subpastas)
2. Filtra apenas os XMLs cujo nome corresponde à lista fornecida
3. Valida os XMLs encontrados
4. (Opcional) Verifica se os XMLs já existem no SIEG
5. Envia os XMLs para a API SIEG
6. Mostra um resumo com sucessos e erros

### Ao reprocessar por chave (`--reprocessar-arquivo` ou `--reprocessar`):
1. Busca todos os XMLs na pasta especificada (incluindo subpastas)
2. Extrai a chave de acesso de cada XML
3. Filtra apenas os XMLs cuja chave está na lista fornecida
4. Valida os XMLs encontrados
5. (Opcional) Verifica se os XMLs já existem no SIEG
6. Envia os XMLs para a API SIEG
7. Mostra um resumo com sucessos e erros

## Notas

- O script procura os XMLs recursivamente na pasta especificada
- Apenas XMLs válidos serão processados
- Chaves inválidas ou não encontradas serão reportadas
- O script pede confirmação antes de enviar
