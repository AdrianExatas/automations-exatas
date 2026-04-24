# Correcoes na Extracao de Chaves

## Melhorias aplicadas

- leitura robusta de planilhas com tentativa de preservacao de chaves grandes
- tratamento explicito de valores em notacao cientifica e conversoes que perdem precisao
- suporte para arquivos `.xlsx`, `.xls` e `.txt`
- mensagens de erro mais detalhadas durante a extracao
- validacao mais restrita para aceitar apenas chaves de 44 digitos

## Arquivos relevantes

- `src/sieg_xml/core/chave_extractor.py`
- `src/sieg_xml/utils/ui_utils.py`
- `src/sieg_xml/cli/commands/extract.py`

## Como testar

Via CLI oficial:

```bash
sieg-xml extract --arquivo caminho\para\arquivo.xlsx
```

Ou com o modulo:

```bash
python -m sieg_xml extract --arquivo caminho\para\arquivo.xlsx
```

## Observacoes

- valores salvos como numero no Excel podem ter perdido precisao antes mesmo da leitura; quando isso acontece o arquivo precisa ser corrigido na origem
- arquivos `.txt` aceitam uma chave por linha ou texto livre com chaves espalhadas
- a interface oficial para extracao passou a ser a CLI do pacote; os antigos wrappers em `scripts/` foram removidos
