import { defineAutomationManifest } from "../../packages/automation-config/src/contracts";

const certificadosCredentialSources = ["unecont", "onvio", "self"] as const;

export default defineAutomationManifest({
  manifestVersion: 1,
  id: "certificados",
  name: "Certificados",
  description: "Atualização de certificados digitais (.pfx) em Unecont, Onvio e Sieg.",
  detailedDescription:
    "Automação para atualizar certificados digitais A1 (.pfx) em múltiplas plataformas. Cada ação é independente e pode ser executada individualmente.",
  requiredCredentials: ["UNECONT_EMAIL", "UNECONT_SENHA", "ONVIO_UDS_LONG_TOKEN", "SIEG_API_KEY"],
  category: "fiscal",
  application: {
    adminOnly: true,
    credentialFields: [
      {
        key: "UNECONT_EMAIL",
        label: "E-mail (Unecont)",
        type: "email",
        placeholder: "E-mail de acesso Unecont",
      },
      {
        key: "UNECONT_SENHA",
        label: "Senha (Unecont)",
        type: "password",
        placeholder: "Senha de acesso Unecont",
      },
      {
        key: "SIEG_API_KEY",
        label: "Chave da API (Sieg)",
        type: "password",
        placeholder: "Chave de acesso à API Sieg",
      },
    ],
    customSection: {
      kind: "certificados-bulk",
      anchorId: "certificados-unificado",
      title: "Atualizar certificados",
      description: "Dados do certificado e escolha das plataformas.",
    },
  },
  actions: [
    {
      id: "atualizar-unecont",
      label: "Atualizar certificado Unecont",
      ariaLabel: "Enfileirar job: atualizar certificado no Unecont",
      description:
        "Login no Unecont, busca empresa por CNPJ, opcionalmente exclui certificado anterior, faz upload do .pfx e salva.",
      estimatedManualMinutes: 15,
      prerequisites: [
        "UNECONT_EMAIL e UNECONT_SENHA configurados",
        "CERTIFICADO_PFX_PATH e CERTIFICADO_SENHA no env do job",
      ],
      outputDescription: "Certificado atualizado no Unecont.",
      hidden: true,
      application: {
        adminOnly: true,
        envFields: [
          {
            key: "UNECONT_EMPRESA",
            label: "CNPJ ou ParceiroEmpresaId",
            type: "text",
            required: true,
          },
          {
            key: "CERTIFICADO_PFX_PATH",
            label: "Caminho do arquivo .pfx",
            type: "text",
            required: true,
          },
          {
            key: "CERTIFICADO_SENHA",
            label: "Senha do certificado",
            type: "password",
            required: true,
          },
          {
            key: "SUBSTITUIR",
            label: "Substituir certificado existente (1 ou true)",
            type: "text",
          },
        ],
      },
      runtime: {
        script: "atualizar-unecont",
        credentialSources: [...certificadosCredentialSources],
      },
    },
    {
      id: "atualizar-onvio",
      label: "Atualizar certificado Onvio",
      ariaLabel: "Enfileirar job: atualizar certificado no Onvio (Manifesto/NFe)",
      description:
        "Desativa cliente no Onvio, envia novo certificado via multipart. Usa token UDS compartilhado.",
      estimatedManualMinutes: 10,
      rules: ["Requer token Onvio válido (ação tokens do Onvio)"],
      prerequisites: [
        "Token Onvio obtido (via ação tokens ou ONVIO_UDS_LONG_TOKEN)",
        "CNPJ (cliente Onvio é buscado por CNPJ automaticamente)",
        "CERTIFICADO_PFX_PATH e CERTIFICADO_SENHA no env do job",
      ],
      outputDescription: "Certificado atualizado no Onvio Manifesto/NFe.",
      hidden: true,
      application: {
        adminOnly: true,
        envFields: [
          {
            key: "ONVIO_CNPJ",
            label: "CNPJ (cliente Onvio buscado por CNPJ)",
            type: "text",
            required: true,
          },
          {
            key: "CERTIFICADO_PFX_PATH",
            label: "Caminho do arquivo .pfx",
            type: "text",
            required: true,
          },
          {
            key: "CERTIFICADO_SENHA",
            label: "Senha do certificado",
            type: "password",
            required: true,
          },
          {
            key: "ONVIO_IMPORT_NFE_SINCE",
            label: "Importar NFe desde (YYYY-MM-DD)",
            type: "text",
          },
        ],
      },
      runtime: {
        script: "atualizar-onvio",
        credentialSources: [...certificadosCredentialSources],
        tokenRefresh: {
          refreshTarget: {
            automation: "onvio",
            action: "tokens",
          },
          retryOnTokenInvalidLog: true,
        },
      },
    },
    {
      id: "atualizar-sieg",
      label: "Atualizar certificado Sieg",
      ariaLabel: "Enfileirar job: atualizar certificado no SIEG",
      description:
        "Lista certificados existentes no SIEG, atualiza se já existe ou registra novo para o CNPJ.",
      estimatedManualMinutes: 10,
      prerequisites: [
        "SIEG_API_KEY configurada",
        "SIEG_CNPJ, CERTIFICADO_PFX_PATH e CERTIFICADO_SENHA no env do job",
      ],
      outputDescription: "Certificado atualizado/registrado no SIEG.",
      hidden: true,
      application: {
        adminOnly: true,
        envFields: [
          { key: "SIEG_CNPJ", label: "CNPJ (14 dígitos)", type: "text", required: true },
          {
            key: "CERTIFICADO_PFX_PATH",
            label: "Caminho do arquivo .pfx",
            type: "text",
            required: true,
          },
          {
            key: "CERTIFICADO_SENHA",
            label: "Senha do certificado",
            type: "password",
            required: true,
          },
        ],
      },
      runtime: {
        script: "atualizar-sieg",
        credentialSources: [...certificadosCredentialSources],
      },
    },
  ],
});
