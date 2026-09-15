# Publicar Documentos Express

Aplicativo Electron para validar guias PDF externas, confirmar empresa, tarefa e vencimento,
concluir a tarefa pelo Express e acompanhar a publicacao no Portal do Cliente.

## Estado da integracao

O processamento local, a interface, os relatorios e o gateway autenticado estao implementados.
Em producao, as cinco capacidades usam contratos observados e versionados: empresa, tarefa,
anexo/conclusao, publicacao no Portal e vencimento no calendario. O fluxo revalida o estado
remoto antes das escritas e salva cada etapa para permitir retomada sem repetir uma conclusao
incerta.

A identificacao usa exclusivamente CNPJ valido extraido do conteudo do PDF. Numeros no nome
do arquivo nao participam da resolucao. Empresa, tarefa e vencimento sao exibidos e
confirmados separadamente antes da revisao final.

Quando um envio concluido foi desfeito operacionalmente, a validacao reconcilia o registro
local com o Express e o Portal. O novo envio so e liberado se a mesma tarefa estiver novamente
aberta e o documento de mesmo nome nao existir mais no Portal.

## Desenvolvimento

```powershell
bun install
bun run --cwd Onvio/gestta-tarefas/publicar-documentos-express test
bun run --cwd Onvio/gestta-tarefas/publicar-documentos-express build
bun run --cwd Onvio/gestta-tarefas/publicar-documentos-express electron:demo
```

O modo demonstracao nao acessa nem altera o Express ou o Onvio. Para abrir o aplicativo em
modo de producao autenticado, use `bun run electron`.

## Instalador Windows

```powershell
bun run --cwd Onvio/gestta-tarefas/publicar-documentos-express dist:win
```

Relatorios operacionais sao gravados em
`Documentos/Publicar Documentos Express/relatorios`. Credenciais podem ser protegidas pelo
`safeStorage` do Electron e nunca sao incluidas nos relatorios.
