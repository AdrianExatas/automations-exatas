Sim, **é possível buscar processos trabalhistas por CNPJ**, mas há algumas particularidades importantes. A resposta curta é: **sim via DataJud**, porém **não é uma busca simples como "informar CNPJ e receber todos os processos"**. É necessário consultar corretamente os campos indexados e considerar limitações de sigilo.

No caso do seu projeto (monitorar 400+ empresas), a busca por CNPJ é justamente o caminho mais adequado.

## Como funciona no DataJud

Os processos possuem participantes (polos) com documentos. A consulta normalmente é feita pesquisando o CNPJ dentro dos dados de partes:

Exemplo conceitual:

```json
{
  "query": {
    "nested": {
      "path": "partes",
      "query": {
        "match": {
          "partes.numeroDocumento": "12345678000199"
        }
      }
    }
  }
}
```

O retorno pode trazer algo como:

```json
{
  "numeroProcesso": "0001234-56.2026.5.02.0001",
  "tribunal": "TRT2",
  "classe": "Reclamação Trabalhista",
  "partes": [
    {
      "nome": "EMPRESA XYZ LTDA",
      "tipo": "RECLAMADO",
      "documento": "12345678000199"
    }
  ]
}
```

---

## O ponto crítico: consultar todos os TRTs

A Justiça do Trabalho é dividida em vários Tribunais Regionais do Trabalho:

* TRT1 → RJ
* TRT2 → SP capital
* TRT3 → MG
* ...
* TRT24 → MS

A API do DataJud possui um índice por tribunal. Então a arquitetura normalmente fica:

```
CNPJ
 |
 |
+----------------+
| Motor Consulta|
+----------------+
 |
 +--> TRT1
 |
 +--> TRT2
 |
 +--> TRT3
 |
 ...
 |
 +--> TRT24
```

Depois você consolida:

```
CNPJ: 12.345.678/0001-99

Processos encontrados:
----------------------------

TRT2
0001234-56.2025.5.02.0001

TRT15
0019876-44.2026.5.15.0002
```

---

## Para 400 clientes, eu faria assim

Não consultaria todos os TRTs toda hora.

Criaria uma rotina:

### 1. Cadastro inicial (carga completa)

Executa uma vez:

```
400 CNPJs
    |
    |
Consulta todos TRTs
    |
    |
Grava processos encontrados
```

Resultado:

```
Empresa A
 - 15 processos

Empresa B
 - 3 processos

Empresa C
 - nenhum
```

---

### 2. Monitoramento diário

Depois:

```
Todos os dias:

CNPJ
 ↓
DataJud
 ↓
Comparar com banco
 ↓
Existe processo novo?
 ↓
Notificar
```

Exemplo:

Ontem:

```
Empresa XPTO

Processos:
10
```

Hoje:

```
Empresa XPTO

Processos:
11
```

Sistema:

```
🚨 Novo processo trabalhista identificado

Empresa: XPTO LTDA

Processo:
0005555-22.2026.5.02.0003

Data distribuição:
04/09/2026
```

---

## Algumas limitações que vocês precisam considerar

### 1. Processos em segredo de justiça

Não aparecerão integralmente.

### 2. Dados podem ter atraso

O DataJud depende da alimentação dos tribunais.

### 3. Documento da parte precisa estar no processo

Alguns processos antigos podem ter somente nome da empresa.

### 4. Grupo econômico

Se a empresa possui filiais:

```
Matriz:
12.345.678/0001-99

Filial:
12.345.678/0002-70
```

Eu monitoraria todos os CNPJs relacionados.

---

## Para o seu caso específico (+400 clientes), eu criaria uma tabela de monitoramento:

```
empresas_monitoradas

id
razao_social
cnpj
trts_consultados
ultima_consulta
qtd_processos
```

E:

```
processos

numero
cnpj_reclamado
trt
classe
data_distribuicao
ultima_movimentacao
status_alerta
```

---

Então, respondendo objetivamente:

**Sim, dá para buscar por CNPJ e esse é o modelo correto para o seu caso.**
A solução ideal seria criar um robô que diariamente consulta os CNPJs no DataJud, cruza com sua base interna e dispara alertas apenas quando houver **processo novo ou movimentação relevante**.

O próximo passo técnico seria validar **qual endpoint do DataJud e qual campo exato de CNPJ usar**, porque isso varia conforme o índice dos TRTs. Eu montaria um "POC" primeiro com uns 5 CNPJs reais antes de escalar para os 400.
