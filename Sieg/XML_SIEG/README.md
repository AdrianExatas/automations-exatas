# Sistema de Gerenciamento de XMLs Fiscais - SIEG

Sistema modular para gerenciamento de XMLs fiscais (NFe, NFCe, NFSe, CTe, CFe) integrado com a API SIEG.

## 📁 Estrutura do Projeto

```
XML_SIEG/
├── src/
│   └── sieg_xml/              # Módulo principal
│       ├── __init__.py
│       ├── config.py           # Configurações centralizadas
│       ├── api/                # Integração com API SIEG
│       │   ├── client.py       # Cliente da API
│       │   └── endpoints.py    # Definições de endpoints
│       ├── core/               # Funcionalidades principais
│       │   ├── xml_parser.py   # Parsing e validação de XML
│       │   ├── xml_organizer.py # Organização por data
│       │   └── chave_extractor.py # Extração de chaves
│       ├── utils/              # Utilitários
│       │   ├── file_utils.py   # Operações com arquivos
│       │   ├── excel_utils.py  # Operações com Excel
│       │   └── ui_utils.py     # Interface gráfica (tkinter)
│       └── services/           # Serviços de alto nível
│           ├── download_service.py # Serviço de download
│           └── upload_service.py  # Serviço de upload
├── scripts/                    # Scripts CLI
│   ├── baixar_xmls.py         # Download de XMLs
│   ├── enviar_xmls.py         # Upload de XMLs
│   ├── extrair_chaves.py      # Extração de chaves
│   └── organizar_xmls.py      # Organização de XMLs
├── requirements.txt
├── env.example.txt            # Exemplo de configuração
└── README.md
```

## 🚀 Instalação

1. Clone o repositório ou baixe os arquivos
2. Instale as dependências:

```bash
pip install -r requirements.txt
```

3. Configure a API Key:

   - Copie `env.example.txt` para `.env`
   - Edite o arquivo `.env` e adicione sua chave de API do SIEG:
   ```
   SIEG_API_KEY=sua_chave_aqui
   ```

## 📖 Uso

### Download de XMLs

Baixa XMLs da API SIEG usando chaves de acesso de uma planilha Excel:

```bash
python scripts/baixar_xmls.py
```

O script irá:
- Abrir um diálogo para selecionar a planilha Excel
- Identificar automaticamente a coluna com chaves de acesso
- Baixar os XMLs e organizá-los por ano em `xmls_baixados/`

**Suporte a NFe e CTe no download:** O download usa o endpoint BaixarXml da API SIEG com o parâmetro `xmlType` correto para cada documento. O tipo é **inferido automaticamente pela chave de acesso** (posições 21-22: 55 = NF-e, 57 = CT-e). Não é necessário informar se a chave é NFe ou CTe. O valor de `xmlType` para CTe pode ser conferido na [documentação oficial da API SIEG](https://api.sieg.com/swagger/ui/index#!/Download/Download_BaixarXml); se a API usar outro valor, ajuste `XML_TYPE_CTE` em `src/sieg_xml/config.py`.

### Envio de XMLs

Envia XMLs para a API SIEG:

```bash
# Modo interativo
python scripts/enviar_xmls.py

# Modo automático (verifica, envia e exclui)
python scripts/enviar_xmls.py --auto

# Modo automático com pasta específica
python scripts/enviar_xmls.py --auto --pasta "C:\Minha\Pasta"
```

### Extração de Chaves

Extrai chaves de XML de planilhas Excel ou arquivos de texto:

```bash
python scripts/extrair_chaves.py
```

O script suporta:
- **Arquivos Excel** (.xlsx, .xls): Extrai chaves de todas as células
- **Arquivos de texto** (.txt): Suporta formato de uma chave por linha ou chaves em qualquer lugar do texto

### Organização de XMLs

Organiza XMLs na pasta raiz por ano (apenas ano, sem mês):

```bash
python scripts/organizar_xmls.py
```

Se você já tem XMLs em estrutura **ano/mês** e quer deixar só **por ano**:

```bash
python scripts/reorganizar_por_ano.py
```

## 🔧 Configuração

As configurações estão centralizadas em `src/sieg_xml/config.py`. Principais opções:

- **API URLs**: URLs da API SIEG
- **PASTA_XMLS_BAIXADOS**: Pasta onde os XMLs são salvos (padrão: `xmls_baixados`)
- **NUM_THREADS_PADRAO**: Número de threads para processamento paralelo (padrão: 20)
- **RETRY_MAX_TENTATIVAS**: Número máximo de tentativas em caso de erro (padrão: 3)

## 📦 Módulos Principais

### `sieg_xml.api`
Cliente para integração com a API SIEG:
- `SiegAPIClient`: Classe principal para operações da API
- Métodos: `download_xml()`, `upload_xml()`, `verify_xml_exists()`

### `sieg_xml.core`
Funcionalidades principais de parsing e processamento:
- `validar_xml()`: Valida se XML é bem formado
- `extrair_chave_acesso()`: Extrai chave de acesso do XML
- `extrair_data_xml()`: Extrai ano e mês da data de emissão
- `identificar_tipo_xml()`: Identifica tipo de documento fiscal

### `sieg_xml.services`
Serviços de alto nível:
- `DownloadService`: Gerencia download e organização de XMLs
- `UploadService`: Gerencia upload com verificação e processamento paralelo

### `sieg_xml.utils`
Utilitários diversos:
- `file_utils`: Operações com arquivos
- `excel_utils`: Operações com planilhas Excel
- `ui_utils`: Interface gráfica (diálogos tkinter)

## 🎯 Funcionalidades

- ✅ Download de XMLs da API SIEG
- ✅ Upload de XMLs para a API SIEG
- ✅ Verificação de duplicatas antes do envio
- ✅ Processamento paralelo para melhor performance
- ✅ Organização automática por ano
- ✅ Extração de chaves de planilhas Excel
- ✅ Validação de XMLs
- ✅ Identificação automática de tipos de documento (NFe, NFCe, NFSe, CTe, CFe)
- ✅ Retry automático em erros recuperáveis
- ✅ Warm-up gradual para evitar sobrecarga do servidor

## 📝 Notas

- Os XMLs baixados são organizados automaticamente em `xmls_baixados/ano/`
- O sistema suporta NFe, NFCe, NFSe, CTe e CFe (organização e parsing). O **download** pela API SIEG suporta **NFe e CTe**: o tipo é inferido pela chave (posições 21-22: 55 = NFe, 57 = CTe).
- A verificação de duplicatas é opcional e pode aumentar o tempo de processamento
- O modo automático exclui XMLs enviados com sucesso (configurável)

## 🔄 Migração dos Scripts Antigos

Os scripts antigos na raiz do projeto ainda funcionam, mas recomenda-se migrar para os novos scripts em `scripts/` que usam a estrutura modular refatorada.

## 📄 Licença

Este projeto é de uso interno.

## Geracao de DANFE (PDF)

Gera DANFE para todos os XMLs dentro de `xmls_baixados` (recursivo), com
consolidacao por ano e consolidacao geral em PDF unico.

### Comando

```bash
python scripts/gerar_danfes.py
```

### Opcoes

```bash
python scripts/gerar_danfes.py --entrada xmls_baixados --saida danfes_gerados
python scripts/gerar_danfes.py --anos 2024,2025
python scripts/gerar_danfes.py --sobrescrever
```

- `--entrada`: pasta raiz com XMLs (padrao: `xmls_baixados`)
- `--saida`: pasta de saida (padrao: `danfes_gerados`)
- `--sobrescrever`: regenera PDFs individuais existentes
- `--anos`: filtra por ano de emissao (`dhEmi`/`dEmi`)

### Estrutura de saida

```text
danfes_gerados/
  individuais/{ANO}/{CHAVE}.pdf
  consolidados/DANFE_{ANO}_JUNTO.pdf
  consolidados/DANFE_TODOS_JUNTO.pdf
  logs/processamento_{timestamp}.csv
```
