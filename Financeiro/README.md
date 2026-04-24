# Financeiro NFS-e

Aplicacao local para consultar NFS-e na Omie, baixar XML/PDF via WebISS e renomear os PDFs com regra padronizada.

## Uso principal

```bash
python -m financeiro_nfse consultar
python -m financeiro_nfse baixar --input samples/nfse_2026-03.json
python -m financeiro_nfse renomear --tipo servico --input var/saida_nfse/03-2026/pdf
python -m financeiro_nfse processar
python -m financeiro_nfse gui renomear
```

## Entry points

Compatibilidade direta:

```bash
python baixar_nfse_mes_anterior.py
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
