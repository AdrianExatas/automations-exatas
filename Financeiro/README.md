# Financeiro NFS-e

Aplicacao local para consultar NFS-e na Omie, baixar XML/PDF via WebISS e renomear os PDFs com regra padronizada.

## Uso principal

```bash
python -m financeiro_nfse consultar --data-inicial 25/03/2026 --data-final 31/03/2026
python -m financeiro_nfse baixar --input samples/nfse_2026-03.json
python -m financeiro_nfse renomear --tipo servico --input var/saida_nfse/03-2026/pdf
python -m financeiro_nfse processar --data-inicial 25/03/2026 --data-final 31/03/2026
python -m financeiro_nfse gui renomear
```

O comando `gui renomear` abre a interface grafica com duas acoes: baixar e organizar notas por intervalo de datas ou renomear notas externas.
Os comandos `consultar` e `processar` exigem `--data-inicial` e `--data-final` no formato `DD/MM/AAAA`.
Por compatibilidade, `--competencia MM-AAAA` ainda consulta o mes inteiro.

## Interface grafica

Para abrir a interface local durante o desenvolvimento:

```powershell
.\.venv\Scripts\python.exe renomear_notas_gui.py
```

Na tela principal, informe a data inicial, a data final e onde os arquivos devem ser salvos. O botao
`Baixar e organizar notas` consulta a Omie, baixa XML/PDF e renomeia os PDFs automaticamente.
Use `Renomear notas externas` para PDFs ja baixados de outras fontes. Campos tecnicos ficam
recolhidos em `Opcoes avancadas`. Durante uma execucao, use `Cancelar` para interromper o processo.
O intervalo deve ficar dentro do mesmo mes; a pasta, o JSON e os prefixos continuam usando a competencia `MM-AAAA` derivada da data inicial.

## Gerar executavel portatil

O pacote Windows e gerado em modo pasta portatil:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-build.txt
.\scripts\build_exe.ps1
```

O script exige `config/.env` com `APP_KEY` e `APP_SECRET` e copia esse arquivo para o pacote local.
O arquivo `.env` nao deve ser versionado.

Depois do build, abra:

```text
dist\Financeiro NFSe\Financeiro NFSe.exe
```

No pacote gerado, configuracoes ficam em `config\` e as saidas/logs ficam em `var\`.
Para gerar PDFs, o computador precisa ter o Google Chrome instalado.

## Gerar instalador Windows

Para gerar um instalador `.exe` com assistente grafico:

```powershell
.\scripts\build_installer.ps1
```

O instalador sera criado em:

```text
dist\Financeiro NFSe Setup.exe
```

Por padrao, ele instala a aplicacao para o usuario atual em
`%LOCALAPPDATA%\Programs\Financeiro NFSe`, cria atalhos na area de trabalho e no menu iniciar,
e preserva `config\` e `var\` em reinstalacoes.

Tambem e possivel instalar sem interface:

```powershell
.\dist\Financeiro NFSe Setup.exe --silent
```

## Entry points

Compatibilidade direta:

```bash
python baixar_nfse_mes_anterior.py --data-inicial 25/03/2026 --data-final 31/03/2026
python baixar_arquivos_nfse.py
python renomear_notas.py --tipo servico
python renomear_notas_gui.py
```

Atalhos em `scripts/`:

- `scripts/SERVICO_renomear_notas.py`
- `scripts/PRODUTOS_renomear_notas.py`
- `scripts/Renomear_Notas_GUI.bat`
- `scripts/SERVICO_renomear_notas.bat`
- `scripts/PRODUTOS_renomear_notas.bat`

## Estrutura

- `financeiro_nfse/`: pacote principal
- `config/`: exemplos de configuracao
- `samples/`: arquivos de exemplo
- `scripts/`: launchers e atalhos operacionais
- `tests/`: testes do projeto
- `var/`: saidas operacionais locais
- `requirements.txt`: dependencias Python do subprojeto
