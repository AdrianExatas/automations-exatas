# Automação Omie - Contratos de Serviços

Este projeto contém automação para o sistema Omie, organizada em uma estrutura modular e fácil de manter.

## Estrutura do Projeto

```
├── src/                          # Código fonte principal
│   ├── __init__.py
│   ├── omie_automation.py        # Automação do Omie
│   ├── validation.py             # Validação de contratos
│   └── gui.py                    # Interface gráfica principal
├── utils/                        # Utilitários comuns
│   ├── __init__.py
│   ├── logger.py                 # Sistema de logging
│   ├── checkpoint.py             # Gerenciamento de checkpoints
│   ├── selenium_utils.py         # Utilitários do Selenium
│   └── data_utils.py             # Manipulação de dados
├── config/                       # Configurações
│   └── __init__.py
├── logs/                         # Logs e resultados
│   ├── log_omie_*.txt           # Logs de execução
│   ├── resultado_omie_*.xlsx    # Planilhas de resultado
│   └── omie_checkpoint.txt      # Arquivo de checkpoint
├── main.py                       # Arquivo principal
├── limpar_logs.py                # Script de gerenciamento de logs
├── requirements.txt              # Dependências
├── config.env                    # Variáveis de ambiente
└── README.md                     # Este arquivo
```

## Funcionalidades

### Omie - Contratos de Serviços
- Login automático no sistema Omie
- Navegação para contratos de serviços
- Processamento em lote de CNPJs
- Preenchimento automático de valores e datas
- Sistema de checkpoint para retomada de execução
- Interface gráfica intuitiva
- Modo simulação para testes

### Validação de Contratos
- Verificação automática se o "Adicional de Final de Ano" foi adicionado
- Validação em lote de CNPJs da planilha
- Geração de relatório detalhado com status de cada CNPJ
- Identificação de CNPJs com adicional faltando
- Estatísticas de validação

## Organização de Arquivos

### Pasta `logs/`
Todos os arquivos gerados pela automação são salvos na pasta `logs/`:

- **`log_omie_YYYY-MM-DD_HH-MM-SS.txt`**: Logs detalhados de cada execução
- **`resultado_omie_YYYY-MM-DD_HH-MM-SS.xlsx`**: Planilha com resultados do processamento
- **`validacao_YYYY-MM-DD_HH-MM-SS.txt`**: Logs detalhados de cada validação
- **`resultado_validacao_YYYY-MM-DD_HH-MM-SS.xlsx`**: Planilha com resultados da validação
- **`omie_checkpoint.txt`**: Arquivo de checkpoint para retomada de execução
- **`validacao_checkpoint.txt`**: Arquivo de checkpoint para retomada de validação

### Vantagens da Organização
- ✅ Todos os arquivos de saída em um local centralizado
- ✅ Fácil identificação de execuções por data/hora
- ✅ Não polui a pasta raiz do projeto
- ✅ Facilita backup e limpeza de arquivos antigos

### Gerenciamento de Logs
Use o script `limpar_logs.py` para gerenciar os arquivos de log:

```bash
python limpar_logs.py
```

Funcionalidades:
- **Listar arquivos**: Visualiza todos os logs com tamanho e data
- **Limpar logs antigos**: Remove arquivos com mais de 30 dias
- **Limpar todos os logs**: Remove todos os logs (exceto checkpoint)

## Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure o arquivo `config.env` com suas credenciais:
   ```
   EMAIL=seu_email@exemplo.com
   SENHA=sua_senha
   ```

## Uso

Execute o arquivo principal:
```bash
python main.py
```

A interface gráfica será aberta com três abas:
- **Execução**: Para processar CNPJs e adicionar o Adicional de Final de Ano
- **Validação**: Para verificar se o adicional foi adicionado aos CNPJs
- **Configurações**: Para configurar o modo simulação e visualizar instruções

### Como Usar a Validação

1. Na aba "Validação", clique em "[VALIDAR] Iniciar Validação"
2. Selecione a planilha MACRO.xlsx com os CNPJs a serem validados
3. O script irá:
   - Fazer login no Omie
   - Navegar até os contratos de serviços
   - Para cada CNPJ, verificar se o "ADICIONAL DE FINAL DE ANO" está presente
   - Gerar um relatório com os resultados
4. Os resultados serão salvos em `logs/resultado_validacao_*.xlsx`
5. O relatório mostra:
   - CNPJ validado
   - Status (OK/FALTANDO/ERRO)
   - Valor encontrado (se presente)
   - Tempo de processamento

## Características da Refatoração

### Organização Modular
- **Separação de responsabilidades**: Cada módulo tem uma função específica
- **Reutilização de código**: Utilitários comuns compartilhados entre automações
- **Manutenibilidade**: Código mais fácil de manter e expandir

### Melhorias Implementadas
- **Sistema de logging centralizado**: Logs consistentes em toda a aplicação
- **Gerenciamento de checkpoints**: Sistema robusto para retomada de execução
- **Utilitários Selenium**: Funções reutilizáveis para automação web
- **Interface intuitiva**: Interface gráfica moderna e fácil de usar
- **Tratamento de erros**: Melhor tratamento e recuperação de erros

### Estrutura de Classes
- **OmieAutomation**: Classe dedicada para automação do Omie
- **AutomationGUI**: Interface gráfica principal

## Configuração

### Variáveis de Ambiente
Configure o arquivo `config.env` com suas credenciais:
```
EMAIL=seu_email@exemplo.com
SENHA=sua_senha
```

### Planilhas de Dados

#### Para Omie (MACRO.xlsx)
Deve conter as colunas:
- CNPJ
- VALOR UNITÁRIO DO ITEM
- Vigencia inicial
- Vigencia Final

## Solução de Problemas

### ChromeDriver
- Se houver erro no ChromeDriver, reinstale o Google Chrome
- Use o botão de teste para verificar se está funcionando

### Credenciais
- Verifique se o arquivo config.env tem as credenciais corretas
- Certifique-se de que as credenciais estão no formato correto

### Planilhas
- Certifique-se de que as planilhas têm as colunas necessárias
- Verifique se os dados estão no formato correto

## Modo Simulação

Use o modo simulação para testar o processamento sem abrir o navegador. Isso é útil para:
- Verificar se os dados estão sendo carregados corretamente
- Testar a lógica de processamento
- Validar o sistema de checkpoints
