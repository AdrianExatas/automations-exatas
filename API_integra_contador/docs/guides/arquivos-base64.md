# Arquivos e conteúdo Base64

Diversos serviços retornam PDF, XML ou outros documentos dentro do JSON escapado de `dados`. O fluxo é:

1. Interpretar o JSON externo.
2. Interpretar `response.dados` como JSON.
3. Localizar o campo Base64 definido pelo contrato específico.
4. Decodificar os bytes.
5. Validar o tipo esperado antes de salvar ou processar.

Exemplo TypeScript:

```ts
const dados = JSON.parse(response.dados) as { PDFByteArrayBase64: string };
const pdf = Buffer.from(dados.PDFByteArrayBase64, "base64");

if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
  throw new Error("O conteúdo retornado não possui assinatura de PDF.");
}
```

Não registre o conteúdo integral em logs. Documentos podem conter dados pessoais ou fiscais. Defina nome de arquivo internamente; nunca use diretamente texto retornado pelo serviço como caminho local.
