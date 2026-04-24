# Separador de Provisão de Décimo Terceiro

Automação local para separar o relatório `Provisão de Décimo Terceiro Salário.pdf`
em um PDF por empresa, preservando exatamente as páginas originais.

## Executar pela linha de comando

```bash
python separar_por_empresa.py
```

## Executar com interface gráfica

```bash
python separar_por_empresa_gui.py
```

## Opções da CLI

```bash
python separar_por_empresa.py --help
```

## Testes

```bash
pytest
```

## Gerar EXE no Windows

```powershell
.\build_exe.ps1
```

O executável principal com interface gráfica será gerado em:

`dist\separar-por-empresa.exe`

Exemplo de uso:

```powershell
.\dist\separar-por-empresa.exe
```

Observação:

- o executável gerado é para Windows
- para funcionar em outra máquina, basta copiar o `.exe` e o PDF de entrada para a mesma pasta
- pela interface, o usuário pode escolher o PDF de entrada, a pasta de saída e marcar `Sobrescrever` ou `Simular`

## Saída

Os arquivos são gerados por padrão em `output/pdf/empresas/` com o nome:

`{{codigo}}-Provisão de Décimo Terceiro Salário.pdf`
