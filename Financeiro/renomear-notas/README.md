# Renomear Notas

Ferramenta para renomear PDFs de notas fiscais (serviço e produtos) extraindo o campo **Nome/Razão Social** do texto do PDF e movendo os arquivos para a pasta `RENOMEADOS` com um prefixo configurável.

## Requisitos

- Python 3.8+
- Dependência: [pypdf](https://pypdf.readthedocs.io/) (leitura de PDFs)

## Instalação

Na pasta do projeto:

```bash
pip install -r requirements.txt
```

## Como usar

### Uso rápido (batch)

Na **raiz do projeto** (pasta onde está `renomear_notas.py`):

- **Notas de serviço:** execute `scripts\SERVICO_renomear_notas.bat` ou:
  ```bash
  python renomear_notas.py --tipo servico
  ```
- **Notas de produtos:** execute `scripts\PRODUTOS_renomear_notas.bat` ou:
  ```bash
  python renomear_notas.py --tipo produtos
  ```

Os PDFs devem estar na **raiz do projeto** (ou use `--pasta-origem`). Os arquivos renomeados são movidos para a subpasta `RENOMEADOS`. Se já existir um arquivo com o mesmo nome, é acrescentado um sufixo numérico, por exemplo `... LTDA (2).pdf`.

### Linha de comando (CLI)

| Opção | Descrição |
|-------|-----------|
| `--tipo servico` ou `--tipo produtos` | Obrigatório. Tipo de nota. |
| `--pasta-origem PASTA` | Pasta onde estão os PDFs (padrão: raiz do projeto). |
| `--pasta-destino PASTA` | Pasta de destino (padrão: `RENOMEADOS` ou valor em `config.ini`). |
| `--competencia MM-AAAA` | Competência no prefixo (ex.: `12-2025`). Se não informado, usa o mês anterior à execução ou `config.ini`. |
| `--prefixo "TEXTO"` | Define o prefixo completo (ignora competência e config). |
| `--dry-run` | Apenas mostra o que seria feito, sem mover arquivos. |
| `--log` | Grava saída em `renomear_notas_YYYYMMDD.log`. |

**Exemplos:**

```bash
# Simular renomeação de notas de serviço (não move nada)
python renomear_notas.py --tipo servico --dry-run

# Usar competência específica
python renomear_notas.py --tipo servico --competencia 12-2025

# Processar pasta específica e registrar em log
python renomear_notas.py --tipo produtos --pasta-origem "C:\Notas" --log
```

### Configuração (config.ini)

Para não precisar informar competência ou pastas toda vez, copie `config.ini.example` para `config.ini` na **raiz do projeto** e ajuste:

```ini
[renomear_notas]
competencia = 12-2025
prefixo_servico = NOTA FISCAL SERVIÇO CONTÁBIL 1-2 COMP
prefixo_produtos = NOTA FISCAL SERVIÇO CONTÁBIL 2-2 COMP
pasta_destino = RENOMEADOS
```

Valores passados na linha de comando têm prioridade sobre o `config.ini`.

## Estrutura do projeto

```
renomear-notas/
├── renomear_notas.py      # Módulo principal (CLI e lógica)
├── requirements.txt
├── README.md
├── config.ini.example     # Copie para config.ini na raiz
├── scripts/               # Launchers
│   ├── SERVICO_renomear_notas.bat
│   ├── PRODUTOS_renomear_notas.bat
│   ├── SERVICO_renomear_notas.py
│   └── PRODUTOS_renomear_notas.py
├── tests/                 # Testes unitários
├── RENOMEADOS/            # Saída: PDFs renomeados
├── SERVIÇOS/              # Opcional: PDFs de serviço para processar
└── PRODUTOS/              # Opcional: PDFs de produtos para processar
```

## Testes

Na pasta do projeto:

```bash
python -m pytest tests/ -v
```

Ou com unittest:

```bash
python -m unittest discover -s tests -v
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| **"Nome/Razão Social não encontrado"** | O texto do PDF pode ter formatação diferente (espaços, quebras). Verifique se o campo aparece no PDF como "Nome/Razão Social" (serviço) ou "NOME / RAZÃO SOCIAL" (produtos). |
| **Erro ao processar PDF** | Arquivo pode estar corrompido ou protegido. Tente abrir no leitor e salvar de novo. |
| **ModuleNotFoundError: pypdf** | Execute `pip install -r requirements.txt` na pasta do projeto. |
| **Encoding / caracteres estranhos no nome** | O script usa normalização NFC para nomes de arquivo. Notas de serviço saem em ASCII (sem acentos); notas de produtos mantêm acentos. |
| **Mudar competência sem editar código** | Use `--competencia 12-2025` na linha de comando ou defina `competencia` em `config.ini`. |

## Git Safety Checklist

1. **Confirmar estado:** `git status`
2. **Criar branch:** `git checkout -b feat/renomear-notas-melhorias`
3. **Checkpoint (se necessário):** `git add -A` e `git commit -m "chore: checkpoint antes das melhorias"`
4. **Aplicar alterações** (já feitas)
5. **Commit:** `git add -A` e `git commit -m "feat: módulo unificado, CLI, config, dry-run, log e testes"`
6. **Verificação:** `python -m pytest tests/ -v`
7. **Rollback:** `git reset --hard HEAD~1` para descartar último commit
