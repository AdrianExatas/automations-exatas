# gestta-tarefas

Grupo de automacoes relacionadas ao Gestta no contexto do Onvio.

## Estrutura

- `alterar-responsavel/`: altera o responsavel das tarefas a partir de uma planilha local
- `inserir-tarefas/`: sincroniza vinculos empresa-tarefa e responsavel por empresa
- `docs/`: documentacao compartilhada das integracoes Gestta/API local
- `_local/`: workspace local ignorado para planilhas, `.env` de grupo e colecoes temporarias

## Convencao local

- dados compartilhados do grupo ficam em `_local/`
- exemplos seguros continuam dentro de cada app
- nao execute nada a partir da raiz do grupo; entre na subpasta da automacao desejada
