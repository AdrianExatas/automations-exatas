# Guia de Deploy - SIEG XML Web

## Visão Geral

Este guia descreve como implantar a aplicação web SIEG XML que utiliza processamento em borda (edge computing). O processamento pesado ocorre no navegador do cliente, enquanto o servidor apenas coordena jobs e armazena logs.

## Requisitos

- Python 3.8 ou superior
- Windows 10 ou superior (ou Linux)
- Conexão com internet (para API SIEG)
- Acesso à rede interna da empresa (para usuários)

## Instalação

### 1. Preparação do Ambiente

```bash
# Clone ou copie os arquivos do projeto para o servidor
# Navegue até o diretório do projeto
cd xml
```

### 2. Instalar Dependências

```bash
pip install -r requirements.txt
```

Dependências principais:
- Flask 2.3.0+ (servidor web)
- Flask-SocketIO 5.3.0+ (WebSocket)
- python-dotenv (variáveis de ambiente)
- Outras dependências do projeto existente

### 3. Configuração

#### Arquivo .env

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
# API SIEG
SIEG_API_KEY=sua_chave_api_aqui

# Servidor Web
WEB_HOST=0.0.0.0
WEB_PORT=5000
DEBUG=False

# Pastas
LOG_DIR=logs
PASTA_PADRAO_XMLS=C:\XMLs

# Segurança (opcional)
SECRET_KEY=gerar-uma-chave-secreta-aleatoria-aqui
```

#### Variáveis de Ambiente

- `SIEG_API_KEY`: Sua chave da API SIEG (obrigatório)
- `WEB_HOST`: Host do servidor (padrão: 0.0.0.0 - aceita conexões externas)
- `WEB_PORT`: Porta do servidor (padrão: 5000)
- `DEBUG`: Modo debug (False para produção)
- `LOG_DIR`: Diretório para logs (padrão: logs)
- `SECRET_KEY`: Chave secreta para sessões Flask (gerar uma aleatória)

## Execução

### Modo Desenvolvimento

```bash
python scripts/start_server.py
```

Ou diretamente:

```bash
python web/app.py
```

### Modo Produção (Windows 10 Service)

#### Opção 1: Usando NSSM (Recomendado para Windows 10)

**Nota**: O NSSM permite criar serviços Windows mesmo no Windows 10 (Home ou Pro).

1. Baixe o NSSM: https://nssm.cc/download
2. Extraia `nssm.exe` na pasta do projeto ou adicione ao PATH
3. Execute o script de instalação:

```cmd
scripts\install_service.bat
```

4. O serviço será instalado como `SIEG_XML_Web`

#### Opção 2: Manualmente com NSSM

```cmd
nssm install SIEG_XML_Web "C:\Python\python.exe" "C:\caminho\para\scripts\start_server.py"
nssm set SIEG_XML_Web AppDirectory "C:\caminho\para\projeto"
nssm start SIEG_XML_Web
```

### Modo Produção (Linux)

#### Usando systemd

Crie o arquivo `/etc/systemd/system/sieg-xml-web.service`:

```ini
[Unit]
Description=SIEG XML Web Service
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/xml
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/python3 /caminho/para/xml/scripts/start_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Ative e inicie o serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sieg-xml-web
sudo systemctl start sieg-xml-web
```

#### Usando Supervisor

```ini
[program:sieg-xml-web]
command=/usr/bin/python3 /caminho/para/xml/scripts/start_server.py
directory=/caminho/para/xml
user=seu-usuario
autostart=true
autorestart=true
stderr_logfile=/var/log/sieg-xml-web.err.log
stdout_logfile=/var/log/sieg-xml-web.out.log
```

## Configuração de Firewall

### Windows Firewall

```powershell
# Permitir porta 5000
New-NetFirewallRule -DisplayName "SIEG XML Web" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### Linux (ufw)

```bash
sudo ufw allow 5000/tcp
```

## Acesso

Após iniciar o servidor, acesse:

```
http://servidor:5000
```

Ou se estiver na mesma máquina:

```
http://localhost:5000
```

## Estrutura de Pastas

```
xml/
├── web/                    # Aplicação web
│   ├── app.py             # Servidor Flask
│   ├── config.py          # Configurações
│   ├── static/            # Arquivos estáticos (JS, CSS)
│   ├── templates/         # Templates HTML
│   └── utils/             # Utilitários
├── logs/                   # Logs da aplicação
├── uploads_temp/          # Uploads temporários (se necessário)
└── scripts/               # Scripts utilitários
```

## Logs

Os logs são salvos em `logs/`:

- `app_YYYY-MM-DD.log` - Logs gerais da aplicação
- `jobs_YYYY-MM-DD.log` - Logs de jobs processados
- Logs são rotacionados diariamente
- Logs antigos (mais de 30 dias) são removidos automaticamente

## Monitoramento

### Verificar se o servidor está rodando

**Windows:**
```cmd
nssm status SIEG_XML_Web
```

**Linux:**
```bash
sudo systemctl status sieg-xml-web
```

### Ver logs em tempo real

**Windows:**
```cmd
tail -f logs\app_YYYY-MM-DD.log
```

**Linux:**
```bash
tail -f logs/app_YYYY-MM-DD.log
```

## Troubleshooting

### Problema: Servidor não inicia

1. Verifique se a porta está disponível:
   ```bash
   netstat -an | findstr :5000  # Windows
   netstat -an | grep :5000     # Linux
   ```

2. Verifique logs de erro:
   - Windows: `logs\service_stderr.log`
   - Linux: `journalctl -u sieg-xml-web`

3. Verifique se todas as dependências estão instaladas:
   ```bash
   pip list | grep -i flask
   ```

### Problema: Clientes não conseguem conectar

1. Verifique firewall (veja seção acima)
2. Verifique se `WEB_HOST` está configurado como `0.0.0.0` (aceita conexões externas)
3. Verifique conectividade de rede:
   ```bash
   ping servidor
   telnet servidor 5000
   ```

### Problema: Erro de API Key

1. Verifique se `SIEG_API_KEY` está configurada no `.env`
2. Verifique se a chave está correta
3. Teste a chave manualmente:
   ```python
   from sieg_xml.config import SIEG_API_KEY
   print(SIEG_API_KEY)
   ```

### Problema: Processamento lento no cliente

- O processamento ocorre no navegador do cliente
- Verifique recursos do cliente (CPU, RAM)
- Reduza o número de threads se necessário
- Para muitos arquivos, processe em lotes menores

## Segurança

### Recomendações

1. **Não exponha para internet pública** - Use apenas em rede interna ou VPN
2. **Use HTTPS em produção** - Configure um proxy reverso (nginx, IIS) com SSL
3. **Configure firewall** - Restrinja acesso apenas de IPs autorizados
4. **Mude SECRET_KEY** - Gere uma chave aleatória única
5. **Monitore logs** - Verifique logs regularmente para atividades suspeitas

### Exemplo com Nginx (HTTPS)

```nginx
server {
    listen 443 ssl;
    server_name seu-servidor.com;
    
    ssl_certificate /caminho/para/cert.pem;
    ssl_certificate_key /caminho/para/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Backup

### Arquivos importantes para backup

- `.env` - Configurações e API Key
- `logs/` - Logs históricos (opcional)
- Código fonte (se modificado)

### Não é necessário backup de

- Jobs em memória (são temporários)
- Uploads temporários

## Atualização

1. Pare o serviço:
   ```cmd
   nssm stop SIEG_XML_Web  # Windows
   sudo systemctl stop sieg-xml-web  # Linux
   ```

2. Faça backup das configurações:
   ```cmd
   copy .env .env.backup
   ```

3. Atualize o código

4. Instale novas dependências:
   ```bash
   pip install -r requirements.txt
   ```

5. Inicie o serviço novamente:
   ```cmd
   nssm start SIEG_XML_Web  # Windows
   sudo systemctl start sieg-xml-web  # Linux
   ```

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs em `logs/`
2. Verifique a documentação do código
3. Entre em contato com a equipe de TI
