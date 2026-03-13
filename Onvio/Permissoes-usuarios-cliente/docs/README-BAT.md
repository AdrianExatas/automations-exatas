# Scripts .BAT para Automação ONVIO

Este diretório contém scripts .bat para facilitar a execução da automação no Windows.

## 📋 Scripts Disponíveis

### 1. `scripts/instalar-dependencias.bat`
Instala todas as dependências necessárias do projeto.

**O que faz:**
- Instala dependências npm
- Instala navegadores do Playwright
- Instala Electron (se necessário)

**Como usar:**
```batch
scripts\instalar-dependencias.bat
```

---

### 2. `scripts/iniciar-interface.bat`
Inicia a interface gráfica Electron.

**O que faz:**
- Verifica se as dependências estão instaladas
- Instala automaticamente se necessário
- Inicia a interface Electron

**Como usar:**
```batch
scripts\iniciar-interface.bat
```

**Recomendado para:** Usuários que preferem interface gráfica

---

### 3. `scripts/executar-automacao.bat`
Executa a automação via linha de comando com entrada interativa.

**O que faz:**
- Solicita credenciais interativamente
- Executa a automação via Playwright
- Mostra logs em tempo real

**Como usar:**
```batch
scripts\executar-automacao.bat
```

**Recomendado para:** Execução rápida via terminal

---

### 4. `scripts/executar-com-config.bat`
Executa a automação usando o arquivo `.env`.

**O que faz:**
- Lê credenciais do arquivo `.env`
- Executa a automação
- Mais seguro (não expõe senha no terminal)

**Como usar:**

1. **Primeira vez:** Copie `.env.example` para `.env`
2. **Edite o arquivo** `.env` com suas credenciais:
   ```
   ONVIO_EMAIL=seu-email@exemplo.com
   ONVIO_PASSWORD=sua-senha
   ONVIO_CLIENT_ID=467
   ONVIO_MFA_METHOD=E-mail
   ONVIO_MFA_CODE=
   ```
3. **Execute:**
   ```batch
   scripts\executar-com-config.bat
   ```

**Recomendado para:** Uso frequente (não precisa digitar credenciais toda vez)

**⚠️ IMPORTANTE:** O arquivo `.env` já está no `.gitignore` para não commitar suas credenciais!

---

## 🚀 Fluxo Recomendado

### Primeira vez:
1. Execute `scripts\instalar-dependencias.bat`
2. Copie `.env.example` para `.env` e configure suas credenciais
3. Escolha uma opção:
   - **Interface gráfica:** Execute `scripts\iniciar-interface.bat`
   - **Linha de comando:** Execute `scripts\executar-automacao.bat` ou `scripts\executar-com-config.bat`

### Uso diário:
- **Interface gráfica:** `scripts\iniciar-interface.bat`
- **Linha de comando com .env:** `scripts\executar-com-config.bat`

---

## 📝 Exemplo de .env

```txt
ONVIO_EMAIL=usuario@exemplo.com
ONVIO_PASSWORD=MinhaSenha123
ONVIO_CLIENT_ID=467
ONVIO_MFA_METHOD=E-mail
ONVIO_MFA_CODE=
```

**Notas:**
- `ONVIO_MFA_CODE` pode ficar vazio (você inserirá manualmente quando solicitado)
- Se `ONVIO_CLIENT_ID` estiver vazio, usará 467 como padrão
- Se `ONVIO_MFA_METHOD` estiver vazio, usará "E-mail" como padrão

---

## 🔒 Segurança

- **Nunca commite** o arquivo `.env` no Git
- O arquivo já está no `.gitignore` por padrão
- Para maior segurança, use a interface Electron (senha não fica em arquivo de texto)

---

## ❓ Solução de Problemas

### Erro: "npm não é reconhecido"
- Instale o Node.js: https://nodejs.org/

### Erro: "Dependências não instaladas"
- Execute `scripts\instalar-dependencias.bat` primeiro

### Erro: "Playwright não encontrado"
- Execute `npx playwright install` manualmente

### Interface não abre
- Verifique se o Electron está instalado: `npm list electron`
- Reinstale: `npm install electron --save-dev`

---

## 📂 Estrutura de Arquivos

```
projeto/
├── scripts/
│   ├── iniciar-interface.bat          # Inicia interface Electron
│   ├── executar-automacao.bat          # Executa via linha de comando (interativo)
│   ├── executar-com-config.bat         # Executa via linha de comando (com .env)
│   ├── instalar-dependencias.bat       # Instala todas as dependências
│   ├── testar-projeto.bat             # Testa estrutura do projeto
│   └── testar-sintaxe.bat              # Testa sintaxe JavaScript
├── .env                                # Arquivo de configuração (não commitado)
├── .env.example                        # Exemplo de configuração
└── docs/
    └── README-BAT.md                    # Este arquivo
```
