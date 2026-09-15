# config/

## `empresas.json`

Registro (slug → CNPJ/UF/IE/razão social) usado pelo backend do portal
(`portal/backend/app/empresas.py`) para exibir nome/UF em vez do CNPJ cru.

> **Atenção**: `razao_social` e `ie` são **placeholders plausíveis**, não há
> razão social/inscrição estadual oficial documentada no repositório para
> `bonsono` e `maxx-papel`. Edite este arquivo com os dados corretos quando
> disponíveis — o campo `cnpj` é a chave real usada para localizar dossiês e
> bases (`_local/dossies/<cnpj>/...`, `motor-fiscal/_local/auditorias/<cnpj>/...`).

Para cadastrar uma nova empresa, adicione um objeto ao array:

```json
{
  "slug": "novo-slug",
  "cnpj": "00000000000000",
  "razao_social": "Nome da Empresa Ltda",
  "uf": "UF",
  "ie": "000000000"
}
```

`cnpj` pode ser digitado com ou sem máscara — o backend normaliza removendo
não-dígitos antes de comparar.
