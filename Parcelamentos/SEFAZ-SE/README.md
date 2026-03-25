# Automacao SEFAZ-SE

## Instalacao

```bash
npm install
npx playwright install chromium
```

## Execucao

```bash
npm run start -- --input ./model.xlsx
```

Para abrir o navegador durante a execucao:

```bash
npm run start -- --input ./model.xlsx --headed
```

## Regras implementadas

- Le todas as linhas da primeira aba de `model.xlsx`.
- Usa `INSCRICAO ESTADUAL` + `CPF` para acessar o portal.
- Seleciona a parcela cujo vencimento esteja no mes corrente.
- Gera o PDF e renomeia para `PARCELA <rotulo> N\u00BA <numero-do-dae>.pdf`.
- O rotulo da parcela segue a regra `parcelas pagas + parcelas atrasadas`; se nao houver atrasadas, usa `parcelas pagas + 1`.
- Salva o PDF em `LOCAL PARA SALVAR ARQUIVO`.
- Gera um relatorio XLSX separado em `output/`.
