# Scripts SIEG – testes da API Certificado

Scripts de teste da API SIEG (certificado), copiados do projeto SIEG_Certificado para referência e uso com o servidor deste projeto.

- **test-atualizar.mjs** – Fluxo completo: extrair CNPJ → listar → editar. Usa `ROOT` do projeto atual (pfx e Senha.txt na raiz). Uso: `node scripts/sieg/test-atualizar.mjs [porta]` (servidor rodando: `npm run server`).
- Os demais scripts (`test-campos-nao-alterados.mjs`, `test-e-validar.mjs`, `test-nova-api.mjs`, `test-tipo-nfse.mjs`, `test-uf-codigo.mjs`) usam caminhos e variáveis que podem precisar ser ajustados (SIEG_API_KEY no .env, paths de PFX/Senha conforme seu ambiente).

Coleção Postman: `docs/postman_sieg_collection.json`.
