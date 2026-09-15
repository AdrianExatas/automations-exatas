---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/modelos/modelo_de_assinador_digital_php/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "6aff42880899e72c7a5c34667f7f6230dc9f0637f45afe67bbaf0fbaa891708f"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/modelos/modelo_de_assinador_digital_php/).

# Modelo de Assinador Digital - PHP

Aqui você encontra um programa de modelo, escrito em `PHP` para servir de referência na implementação do assinador digital. Este exemplo, utiliza um subconjunto do padrão `XMLDSig` para assinatura de documentos XML utilizando a biblioteca OpenSSL.

O assinador digital é necessário para assinar o documento `XML` Termo de Autorização. O certificado digital aqui disponibilizado, será utilizado para testes deste programa, sendo possível simular a assinatura como autor do pedido de dados, para ser submetido a um destinatário.

## Componente

`Serpro.Componentes.AssinadorDigital.php`

Realiza a assinatura digital de documento XML utilizando o padrão `W3C XMLDSig`.

### Linguagem de programação

`PHP`

| Versão | Autor | Código-fonte |
| --- | --- | --- |
| 1.0.0 | SERPRO | Serpro.Componentes.AssinadorDigital.php.zip |

### Certificado Digital

Como demonstração, está sendo disponibilizado este certificado digital que só funciona em ambiente de desenvolvimento e homologação:

Atenção

Este certificado digital e-CNPJ disponibilizado é compatível somente com o ambiente de demonstração. Não possui valor em ambientes produtivos.

- Certificado de homologação [eCNPJ-SERPRO-33683111000107.zip](https://serprodrive.serpro.gov.br/s/9jWDiRjEiqzK8iZ)
- Cadeias de certificação - homologação: [https://repositoriohom.serpro.gov.br/cadeias/serproacf5h1.p7b](https://repositoriohom.serpro.gov.br/cadeias/serproacf5h1.p7b)
- LCR: [https://repositoriohom.serpro.gov.br/lcr/serproacf5h1.crl](https://repositoriohom.serpro.gov.br/lcr/serproacf5h1.crl)

### Dependências

- PHP 8.0+
- Extensão Openssl
- Um certificado digital do tipo ICPBrasil válido

## Créditos e Licença

Esse componente foi criado pelas equipes do SERPRO.

E foi utilizado [licença MIT](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/modelos/LICENSE/) baseado no código open source no projeto do Github [XMLDSIG for PHP](https://github.com/selective-php/xmldsig).

## Nota

Os modelos de implementação aqui fornecidos são exemplos básicos destinados a orientar na implementação de soluções. Recomendamos utilizá-los como referência inicial, mas com cuidado ao considerar sua aplicação em um ambiente de produção. É essencial realizar testes completos para garantir o correto funcionamento e considerar possíveis ajustes e atualizações necessárias antes de utilizar o modelo em um ambiente de produção.
