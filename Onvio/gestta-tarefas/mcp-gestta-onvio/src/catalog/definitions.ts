import type { CapabilityDefinition, JsonSchema, Product, RequestDefinition } from "../types.js";

const VERIFIED_AT = "2026-08-03";
const GESTTA_VERSIONS = ["core:1.0.1209", "admin:1.0.2099"];
const ONVIO_VERSIONS = ["staff:current-import-map", "portal:2025.09.18.1"];

const objectSchema = (
  properties: Record<string, JsonSchema> = {},
  required: string[] = [],
  additionalProperties = false,
): JsonSchema => ({ type: "object", properties, required, additionalProperties });

const string = (description?: string): JsonSchema => ({ type: "string", description });
const boolean = (): JsonSchema => ({ type: "boolean" });
const integer = (minimum = 0, maximum?: number): JsonSchema => ({ type: "integer", minimum, maximum });
const stringArray = (): JsonSchema => ({ type: "array", items: { type: "string" } });
const anyObject: JsonSchema = { type: "object", additionalProperties: true };

interface ApiCapabilityArgs {
  operationId: string;
  title: string;
  description: string;
  product: Product;
  domain: string;
  kind: "read" | "write";
  risk?: CapabilityDefinition["risk"];
  idempotent?: boolean;
  request: RequestDefinition;
  inputSchema?: JsonSchema;
  permissions?: string[];
  licenses?: string[];
  preflightOperationId?: string;
  source?: string;
}

function api(args: ApiCapabilityArgs): CapabilityDefinition {
  return {
    operationId: args.operationId,
    title: args.title,
    description: args.description,
    product: args.product,
    domain: args.domain,
    kind: args.kind,
    status: "verified",
    risk: args.risk || (args.kind === "read" ? "read" : "write"),
    idempotent: args.idempotent ?? args.kind === "read",
    transport: "api",
    requiredPermissions: args.permissions,
    requiredLicenses: args.licenses,
    inputSchema: args.inputSchema || anyObject,
    outputSchema: {},
    request: args.request,
    preflightOperationId: args.preflightOperationId,
    evidence: {
      source: args.source || "frontend-network-and-repository-contract",
      versions: args.product === "gestta" ? GESTTA_VERSIONS : ONVIO_VERSIONS,
      verifiedAt: VERIFIED_AT,
    },
  };
}

function classified(args: {
  operationId: string;
  title: string;
  description: string;
  product: Product;
  domain: string;
  kind: "read" | "write";
  status: "unavailable" | "policy_blocked" | "drifted";
  reason: string;
  risk?: CapabilityDefinition["risk"];
  licenses?: string[];
  transport?: "browser" | "informational";
}): CapabilityDefinition {
  return {
    ...args,
    risk: args.risk || (args.kind === "read" ? "read" : "write"),
    idempotent: args.kind === "read",
    transport: args.transport || "browser",
    requiredLicenses: args.licenses,
    inputSchema: anyObject,
    unavailableReason: args.reason,
    evidence: {
      source: "licensed-feature-and-visible-navigation-inventory",
      versions: args.product === "gestta" ? GESTTA_VERSIONS : ONVIO_VERSIONS,
      verifiedAt: VERIFIED_AT,
    },
  };
}

const gestta: CapabilityDefinition[] = [
  {
    operationId: "unified.customer.resolve",
    title: "Resolver cliente Gestta/Onvio",
    description: "Resolve uma referência por CNPJ, código ou ID e rejeita correspondências ambíguas.",
    product: "external",
    domain: "customers",
    kind: "read",
    status: "verified",
    risk: "read",
    idempotent: true,
    transport: "api",
    inputSchema: objectSchema(
      { cnpj: string(), code: string(), gesttaId: string(), onvioId: string() },
      [],
    ),
    outputSchema: anyObject,
    evidence: {
      source: "cross-provider-contract:Gestta.external_id=Onvio.client.id",
      versions: [...GESTTA_VERSIONS, ...ONVIO_VERSIONS],
      verifiedAt: VERIFIED_AT,
    },
  },
  api({
    operationId: "gestta.session.me",
    title: "Usuário Gestta atual",
    description: "Retorna perfil e permissões do usuário autenticado, com segredos redigidos.",
    product: "gestta",
    domain: "session",
    kind: "read",
    request: { provider: "gestta", method: "GET", path: "/admin/company/user/me" },
    inputSchema: objectSchema(),
  }),
  api({
    operationId: "gestta.customers.list",
    title: "Listar clientes Gestta",
    description: "Lista clientes com paginação e pesquisa.",
    product: "gestta",
    domain: "customers",
    kind: "read",
    request: {
      provider: "gestta",
      method: "GET",
      path: "/admin/customer",
      defaultInput: { active: true, page: 1, limit: 50, search: "" },
    },
    inputSchema: objectSchema({
      active: boolean(),
      page: integer(1),
      limit: integer(1, 500),
      search: string(),
    }),
  }),
  api({
    operationId: "gestta.customers.get",
    title: "Obter cliente Gestta",
    description: "Obtém um cliente Gestta pelo ID.",
    product: "gestta",
    domain: "customers",
    kind: "read",
    request: { provider: "gestta", method: "GET", path: "/admin/customer/{customerId}" },
    inputSchema: objectSchema({ customerId: string() }, ["customerId"]),
  }),
  api({
    operationId: "gestta.users.list",
    title: "Listar usuários Gestta",
    description: "Lista usuários internos do escritório.",
    product: "gestta",
    domain: "users",
    kind: "read",
    request: { provider: "gestta", method: "GET", path: "/admin/company/user", defaultInput: { active: true, page: 1, limit: 50 } },
    inputSchema: objectSchema({ active: boolean(), page: integer(1), limit: integer(1, 500) }),
  }),
  ...[
    ["gestta.departments.list", "Departamentos Gestta", "departments", "/admin/company/department"],
    ["gestta.regimes.list", "Regimes Gestta", "regimes", "/admin/company/regime"],
    ["gestta.workflows.list", "Workflows Gestta", "workflows", "/admin/company/workflow"],
    ["gestta.documents.list", "Documentos Gestta", "documents", "/admin/company/document"],
    ["gestta.groupers.list", "Agrupadores Gestta", "groupers", "/admin/company/grouper"],
    ["gestta.holidays.list", "Feriados Gestta", "holidays", "/admin/company/holiday"],
  ].map(([operationId, title, domain, requestPath]) =>
    api({
      operationId,
      title,
      description: `Lista ${title.toLowerCase()}.`,
      product: "gestta",
      domain,
      kind: "read",
      request: { provider: "gestta", method: "GET", path: requestPath },
      inputSchema: objectSchema({ page: integer(1), limit: integer(1, 500), search: string() }),
    }),
  ),
  api({
    operationId: "gestta.tasks.list",
    title: "Listar modelos de tarefa Gestta",
    description: "Lista tarefas por tipo RECURRENT ou SERVICE_ORDER.",
    product: "gestta",
    domain: "tasks",
    kind: "read",
    request: { provider: "gestta", method: "GET", path: "/admin/company/task", defaultInput: { page: 1, limit: 50 } },
    inputSchema: objectSchema(
      { type: { type: "string", enum: ["RECURRENT", "SERVICE_ORDER"] }, page: integer(1), limit: integer(1, 500), search: string() },
      ["type"],
    ),
  }),
  api({
    operationId: "gestta.customer_tasks.list",
    title: "Tarefas de um cliente Gestta",
    description: "Lista configurações e vínculos de tarefas de um cliente.",
    product: "gestta",
    domain: "task_links",
    kind: "read",
    request: { provider: "gestta", method: "GET", path: "/admin/customer/{customerId}/company/task" },
    inputSchema: objectSchema({ customerId: string() }, ["customerId"]),
  }),
  api({
    operationId: "gestta.task_customers.list",
    title: "Clientes vinculados à tarefa",
    description: "Lista vínculos de clientes de um modelo de tarefa.",
    product: "gestta",
    domain: "task_links",
    kind: "read",
    request: { provider: "gestta", method: "GET", path: "/admin/company/task/{taskId}/customer" },
    inputSchema: objectSchema({ taskId: string() }, ["taskId"]),
  }),
  api({
    operationId: "gestta.task_customers.add",
    title: "Vincular clientes à tarefa",
    description: "Adiciona um ou mais clientes a um modelo de tarefa.",
    product: "gestta",
    domain: "task_links",
    kind: "write",
    idempotent: true,
    permissions: ["COMPANY_TASK_RECURRENT_WRITE"],
    request: { provider: "gestta", method: "POST", path: "/admin/company/task/{taskId}/customer", bodyMode: "input" },
    inputSchema: objectSchema({ taskId: string(), customerId: stringArray() }, ["taskId", "customerId"]),
    preflightOperationId: "gestta.task_customers.list",
  }),
  api({
    operationId: "gestta.group_customers.remove",
    title: "Remover vínculos de tarefas",
    description: "Remove vínculos group_customer por ID.",
    product: "gestta",
    domain: "task_links",
    kind: "write",
    risk: "destructive",
    permissions: ["COMPANY_TASK_RECURRENT_WRITE"],
    request: { provider: "gestta", method: "DELETE", path: "/admin/group/customer", bodyMode: "input" },
    inputSchema: objectSchema({ ids: stringArray() }, ["ids"]),
  }),
  api({
    operationId: "gestta.group_customers.configure",
    title: "Configurar responsável e aprovação",
    description: "Atualiza responsável, aprovadores e regras de aprovação dos vínculos.",
    product: "gestta",
    domain: "task_configuration",
    kind: "write",
    idempotent: true,
    permissions: ["CUSTOMER_RESPONSIBLE_WRITE"],
    request: { provider: "gestta", method: "PATCH", path: "/admin/group/customer/config", bodyMode: "input" },
    inputSchema: objectSchema(
      {
        ids: stringArray(),
        company_user: string(),
        approvers: stringArray(),
        approve: boolean(),
        approve_type: stringArray(),
      },
      ["ids"],
    ),
  }),
  api({
    operationId: "gestta.reports.list",
    title: "Listar relatórios Gestta",
    description: "Lista relatórios disponíveis ao usuário.",
    product: "gestta",
    domain: "reports",
    kind: "read",
    permissions: ["REPORT_WRITE"],
    request: { provider: "gestta", method: "GET", path: "/core/report" },
    inputSchema: objectSchema(),
  }),
];

const onvio: CapabilityDefinition[] = [
  api({
    operationId: "onvio.session.bindings",
    title: "Sessão e vínculos Onvio",
    description: "Retorna metadados redigidos da sessão e dos vínculos do usuário.",
    product: "onvio_gestao",
    domain: "session",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/security/v1/session-and-bindings" },
    inputSchema: objectSchema(),
  }),
  api({
    operationId: "onvio.licenses.list",
    title: "Licenças e recursos Onvio",
    description: "Lista recursos licenciados para calcular disponibilidade de capacidades.",
    product: "onvio_gestao",
    domain: "licenses",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/provisioning/v1/licenses" },
    inputSchema: objectSchema(),
  }),
  api({
    operationId: "onvio.accounts.list",
    title: "Contas Onvio",
    description: "Lista contas ativas e identifica o escritório atual.",
    product: "onvio_gestao",
    domain: "firms",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/profiles/v1/accounts", defaultInput: { active: true, hideNonOnvio: true } },
    inputSchema: objectSchema({ active: boolean(), hideNonOnvio: boolean() }),
  }),
  api({
    operationId: "onvio.firm.get",
    title: "Obter escritório Onvio",
    description: "Retorna dados principais do escritório.",
    product: "onvio_gestao",
    domain: "firms",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/core/v3/companies/{firmId}/main" },
    inputSchema: objectSchema({ firmId: string() }),
    licenses: ["OnvioSetup::Firm"],
  }),
  api({
    operationId: "onvio.clients.search",
    title: "Pesquisar clientes Onvio",
    description: "Pesquisa clientes do escritório com paginação.",
    product: "onvio_gestao",
    domain: "clients",
    kind: "read",
    request: {
      provider: "onvio",
      method: "POST",
      path: "/api/core/v3/companies/{firmId}/clients/search",
      readLike: true,
      bodyMode: "search",
      defaultInput: { page: 1, limit: 50, active: true },
    },
    inputSchema: objectSchema({ firmId: string(), page: integer(1), limit: integer(1, 500), search: string(), active: boolean() }),
    licenses: ["OnvioSetup::Clients"],
  }),
  api({
    operationId: "onvio.contacts.search",
    title: "Pesquisar contatos Onvio",
    description: "Pesquisa contatos do escritório.",
    product: "onvio_gestao",
    domain: "contacts",
    kind: "read",
    request: { provider: "onvio", method: "POST", path: "/api/core/v1/companies/{firmId}/contact-views/search", readLike: true, bodyMode: "search" },
    inputSchema: objectSchema({ firmId: string(), page: integer(1), limit: integer(1, 500), search: string() }),
    licenses: ["OnvioSetup::Contacts"],
  }),
  api({
    operationId: "onvio.contact_relationships.search",
    title: "Vínculos de um contato Onvio",
    description: "Pesquisa clientes relacionados a um contato.",
    product: "onvio_gestao",
    domain: "contacts",
    kind: "read",
    request: { provider: "onvio", method: "POST", path: "/api/core/v1/companies/{firmId}/contacts/{contactId}/relationship-views/search", readLike: true, bodyMode: "search" },
    inputSchema: objectSchema({ firmId: string(), contactId: string(), page: integer(1), limit: integer(1, 500) }, ["contactId"]),
  }),
  api({
    operationId: "onvio.storage.projects.list",
    title: "Listar projetos de documentos",
    description: "Lista projetos/pastas raiz associados a um cliente.",
    product: "onvio_gestao",
    domain: "documents",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/storage/v1/projects", defaultInput: { primaryAssociationType: "Client", getScheduleItems: true } },
    inputSchema: objectSchema({ firmId: string(), primaryAssociationId: string(), primaryAssociationType: string(), getScheduleItems: boolean() }, ["primaryAssociationId"]),
    licenses: ["OnvioDrive::Projects"],
  }),
  api({
    operationId: "onvio.storage.children.list",
    title: "Listar conteúdo de projeto ou pasta",
    description: "Lista pastas e documentos de um contêiner Onvio.",
    product: "onvio_gestao",
    domain: "documents",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/storage/v2/{containerType}/{containerId}/children", defaultInput: { from: 1, pageSize: 100, sort: "name:asc", containersOnly: false, trashed: false, countDocuments: false, calculateLocks: true } },
    inputSchema: objectSchema(
      {
        firmId: string(),
        containerType: { type: "string", enum: ["Projects", "Folders"] },
        containerId: string(),
        from: integer(1),
        pageSize: integer(1, 500),
        sort: string(),
        containersOnly: boolean(),
        trashed: boolean(),
        countDocuments: boolean(),
        calculateLocks: boolean(),
      },
      ["containerType", "containerId"],
    ),
    licenses: ["OnvioDrive::Documents"],
  }),
  api({
    operationId: "onvio.storage.folder.rename",
    title: "Renomear pasta Onvio",
    description: "Altera o nome de uma pasta de documentos.",
    product: "onvio_gestao",
    domain: "documents",
    kind: "write",
    idempotent: true,
    request: { provider: "onvio", method: "PUT", path: "/api/storage/v1/Folders/{folderId}", bodyMode: "input" },
    inputSchema: objectSchema({ firmId: string(), folderId: string(), name: string() }, ["folderId", "name"]),
    licenses: ["OnvioDrive::EditFolders"],
  }),
  api({
    operationId: "onvio.storage.folder.delete",
    title: "Excluir pasta Onvio",
    description: "Move ou exclui uma pasta conforme o contrato do Onvio Drive.",
    product: "onvio_gestao",
    domain: "documents",
    kind: "write",
    risk: "destructive",
    request: { provider: "onvio", method: "DELETE", path: "/api/storage/v1/Folders/{folderId}", bodyMode: "none" },
    inputSchema: objectSchema({ firmId: string(), folderId: string() }, ["folderId"]),
    licenses: ["OnvioDrive::DeleteFolders"],
  }),
  api({
    operationId: "onvio.storage.document.download",
    title: "Baixar documento Onvio",
    description: "Obtém o conteúdo binário de um documento por pasta e ID.",
    product: "onvio_gestao",
    domain: "documents",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/storage/v1/Folders/{folderId}/documents/{documentId}", responseMode: "binary" },
    inputSchema: objectSchema({ firmId: string(), folderId: string(), documentId: string(), outputFileName: string() }, ["folderId", "documentId"]),
    licenses: ["OnvioDrive::Documents"],
  }),
  api({
    operationId: "onvio.news.categories",
    title: "Categorias de notícias",
    description: "Lista categorias de notícias do Portal do Cliente.",
    product: "onvio_portal",
    domain: "news",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/br-news/v1/categories" },
    inputSchema: objectSchema(),
  }),
  api({
    operationId: "onvio.news.list",
    title: "Listar notícias",
    description: "Lista notícias compartilhadas no Portal do Cliente.",
    product: "onvio_portal",
    domain: "news",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/br-news/v1/articles/shared", defaultInput: { pageIndex: 0, itemsPerPage: 50, expand: "sources", period: "ANY_DATE" } },
    inputSchema: objectSchema({ pageIndex: integer(0), itemsPerPage: integer(1, 500), expand: string(), period: string(), search: string() }),
  }),
  api({
    operationId: "onvio.boxe.companies",
    title: "Empresas BOX-e",
    description: "Lista empresas e disponibilidade no BOX-e.",
    product: "onvio_portal",
    domain: "boxe",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/boxe/v1/companies" },
    inputSchema: objectSchema(),
    licenses: ["BRBoxE::BoxEView"],
  }),
  api({
    operationId: "onvio.notifications.counters",
    title: "Contadores de notificações Onvio",
    description: "Retorna contadores de notificações do usuário.",
    product: "onvio_gestao",
    domain: "notifications",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/notification-async/v1/counters" },
    inputSchema: objectSchema(),
  }),
  api({
    operationId: "onvio.dashboard.tasks",
    title: "Estatísticas de processos",
    description: "Consulta estatísticas de tarefas do dashboard Onvio/Gestta.",
    product: "onvio_gestao",
    domain: "dashboard",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/br-gestta-dashboard/v1/statistics/company/{firmId}/tasks" },
    inputSchema: objectSchema({ firmId: string(), start: string(), end: string() }, ["start", "end"]),
  }),
  api({
    operationId: "onvio.dashboard.liable_tasks",
    title: "Tarefas sujeitas a multa",
    description: "Consulta tarefas sujeitas a multa no dashboard.",
    product: "onvio_gestao",
    domain: "dashboard",
    kind: "read",
    request: { provider: "onvio", method: "GET", path: "/api/br-gestta-dashboard/v1/statistics/company/{firmId}/liable-tasks" },
    inputSchema: objectSchema({ firmId: string(), start: string(), end: string() }, ["start", "end"]),
  }),
];

const specialized: CapabilityDefinition[] = [
  api({
    operationId: "onvio.service_requests.create",
    title: "Abrir solicitação de serviço",
    description: "Abre solicitação geral ou trabalhista e opcionalmente envia anexos.",
    product: "onvio_portal",
    domain: "service_requests",
    kind: "write",
    risk: "write",
    request: { provider: "onvio", method: "POST", path: "/api/service-requesting/v1/tickets/generic", bodyMode: "input" },
    inputSchema: objectSchema(
      {
        firmId: string(),
        clientId: string(),
        departmentId: string(),
        requesterId: string(),
        subject: string(),
        description: string(),
        attachments: { type: "array", items: objectSchema({ path: string(), fileName: string() }, ["path"]) },
      },
      ["clientId", "departmentId", "subject", "description"],
    ),
    licenses: ["BRAtendimento::ServiceRequestGeneric"],
    source: "shared/onvio-solicitacoes-servico",
  }),
  api({
    operationId: "onvio.storage.document.upload",
    title: "Enviar documento Onvio",
    description: "Envia um arquivo permitido para uma pasta Onvio.",
    product: "onvio_gestao",
    domain: "documents",
    kind: "write",
    request: { provider: "onvio", method: "POST", path: "/api/storage/v1/folders/{folderId}/documents", bodyMode: "input" },
    inputSchema: objectSchema({ firmId: string(), folderId: string(), filePath: string(), notify: boolean() }, ["folderId", "filePath"]),
    licenses: ["OnvioDrive::NewDocument"],
  }),
  api({
    operationId: "onvio.storage.document.move",
    title: "Mover documento Onvio",
    description: "Move um documento entre pastas preservando seus metadados.",
    product: "onvio_gestao",
    domain: "documents",
    kind: "write",
    idempotent: true,
    request: { provider: "onvio", method: "PUT", path: "/api/storage/v1/folders/{sourceFolderId}/documents/{documentId}", bodyMode: "input" },
    inputSchema: objectSchema({ firmId: string(), sourceFolderId: string(), targetFolderId: string(), documentId: string() }, ["sourceFolderId", "targetFolderId", "documentId"]),
    licenses: ["OnvioDrive::Documents"],
  }),
];

const coverageRows: Array<[string, string, Product, string, "read" | "write", string, string?]> = [
  ["gestta.customers.manage", "Gerenciar cadastro de clientes Gestta", "gestta", "customers", "write", "Contrato de escrita depende de captura UI abortada.", "CUSTOMER_WRITE"],
  ["gestta.users.manage", "Gerenciar usuários e transferências Gestta", "gestta", "users", "write", "Contrato de escrita depende de captura UI abortada.", "COMPANY_USER_WRITE"],
  ["gestta.tasks.manage", "Gerenciar modelos, etapas e geração de tarefas", "gestta", "tasks", "write", "Contratos compostos ainda não possuem fixture versionada.", "COMPANY_TASK_RECURRENT_WRITE"],
  ["gestta.workflows.manage", "Gerenciar workflows Gestta", "gestta", "workflows", "write", "Contratos compostos ainda não possuem fixture versionada.", "COMPANY_WORKFLOW_WRITE"],
  ["gestta.runtime_tasks.manage", "Concluir, desconsiderar, aprovar e transferir tarefas", "gestta", "runtime_tasks", "write", "Endpoints de runtime variam por tipo de tarefa e exigem captura UI.", undefined],
  ["gestta.comments.manage", "Comentários, respostas e menções Gestta", "gestta", "comments", "write", "Endpoints de histórico exigem captura UI.", undefined],
  ["gestta.timesheet.manage", "Lançamentos e cronômetro de timesheet", "gestta", "timesheet", "write", "Endpoints de timesheet exigem captura UI.", undefined],
  ["gestta.responsibles.manage", "Responsáveis e vínculos de clientes e tarefas", "gestta", "responsibles", "write", "Contratos compostos ainda não possuem fixture versionada.", undefined],
  ["gestta.approvals.manage", "Aprovações de tarefas e documentos", "gestta", "approvals", "write", "Fluxos de aprovação exigem captura UI.", undefined],
  ["gestta.notifications.manage", "Notificações Gestta", "gestta", "notifications", "write", "Preferências e disparos exigem captura UI.", undefined],
  ["gestta.integrations.metadata", "Metadados de integrações Gestta", "gestta", "integrations", "read", "Integrações visíveis ainda não possuem contrato de leitura versionado.", undefined],
  ["gestta.email.manage", "Templates, SMTP, domínios e caixas de entrada", "gestta", "email", "write", "Contratos de configuração exigem captura UI.", "COMPANY_EMAIL_TEMPLATE_WRITE"],
  ["gestta.audit.search", "Auditoria detalhada Gestta", "gestta", "audit", "read", "A rota requer filtros obrigatórios ainda não inventariados.", "AUDIT_READ"],
  ["onvio.setup.manage", "Escritórios, clientes, contatos, funcionários e departamentos", "onvio_gestao", "setup", "write", "Microfrontends exigem captura UI de contratos por entidade.", "OnvioSetup::Setup"],
  ["onvio.permissions.manage", "Grupos de permissões Onvio", "onvio_gestao", "permissions", "write", "Operação de alto impacto requer contrato e diff granular.", "OnvioSetup::SecurityGroups"],
  ["onvio.costs.manage", "Custos, taxas, honorários e modelos", "onvio_gestao", "costs", "write", "Módulo financeiro exige fixtures e campos obrigatórios.", "BRCustos::Platform"],
  ["onvio.drive.templates.manage", "Templates e solicitações de documentos", "onvio_gestao", "document_templates", "write", "Microfrontend DMS exige captura UI.", "OnvioDrive::Templates"],
  ["onvio.drive.sharing.manage", "Compartilhamento, aprovação e comunicações", "onvio_gestao", "document_sharing", "write", "Fluxos dependem de destinatários e permissões granulares.", "OnvioDrive::ShareFolders"],
  ["onvio.drive.recycle_bin.manage", "Lixeira e exclusão permanente", "onvio_gestao", "recycle_bin", "write", "Exclusão permanente fica indisponível até contrato específico.", "OnvioDrive::PermanentlyDelete"],
  ["onvio.projects.manage", "Projetos e estruturas de pastas", "onvio_gestao", "projects", "write", "Contratos de projeto e estrutura exigem captura UI.", "OnvioDrive::Projects"],
  ["onvio.notifications.manage", "Preferências e disparos de notificações", "onvio_gestao", "notifications", "write", "Contrato de escrita do microfrontend não foi capturado.", undefined],
  ["onvio.reports.list", "Relatórios Onvio Gestão", "onvio_gestao", "reports", "read", "Relatórios carregados sob demanda exigem inventário autenticado.", "Reports::OnvioUsage"],
  ["onvio.migrations.manage", "Migrações Onvio", "onvio_gestao", "migrations", "write", "Fluxos de migração exigem contrato e rollback específicos.", undefined],
  ["onvio.settings.manage", "Configurações gerais Onvio", "onvio_gestao", "settings", "write", "Microfrontends de configuração exigem captura UI.", "OnvioSetup::Setup"],
  ["onvio.certificates.metadata.manage", "Metadados e referências seguras de certificados", "onvio_gestao", "certificates", "write", "Somente metadados e referências de cofre serão aceitos; contrato UI ainda não capturado.", "BRCertificados::Certificates"],
  ["onvio.portal.employee_requests.manage", "Solicitações de férias, rescisão, afastamento, cadastro e rubricas", "onvio_portal", "service_requests", "write", "Schemas variam por modalidade e serão capturados sem envio real.", "BRAtendimento::ServiceRequestEmployee"],
  ["onvio.portal.cnd.manage", "Consulta e habilitação de CND", "onvio_portal", "cnd", "write", "Contrato depende do módulo CND.", "BRCnd::CNDEnable"],
  ["onvio.portal.nfe_manifest.manage", "Manifestação de NF-e", "onvio_portal", "nfe_manifest", "write", "Operação fiscal exige contrato específico e confirmação reforçada.", "BRAtendimento::ManifestoEnable"],
  ["onvio.portal.reports.list", "Relatórios, protocolos e auditoria digital", "onvio_portal", "reports", "read", "Rotas são carregadas sob demanda e exigem inventário autenticado.", "Reports::OnvioUsage"],
  ["onvio.portal.settings.manage", "Parâmetros, usuários de clientes e notificações", "onvio_portal", "settings", "write", "Microfrontend exige captura UI.", "BRAtendimento::SetupParameters"],
  ["onvio.portal.protocols.list", "Protocolos do Portal do Cliente", "onvio_portal", "protocols", "read", "Rota carregada sob demanda exige inventário autenticado.", undefined],
  ["onvio.portal.notifications.manage", "Notificações do Portal do Cliente", "onvio_portal", "notifications", "write", "Contrato do microfrontend exige captura UI.", undefined],
  ["onvio.messenger.status", "Onvio Messenger", "onvio_messenger", "messenger", "read", "Módulo não ativo no contrato atual.", undefined],
];

const coverage = coverageRows.map(([operationId, title, product, domain, kind, reason, entitlement]) =>
  classified({
    operationId,
    title,
    description: title,
    product,
    domain,
    kind,
    status: "unavailable",
    reason,
    risk: kind === "write" ? (domain === "costs" ? "financial" : domain === "recycle_bin" ? "destructive" : "write") : "read",
    licenses: entitlement?.includes("::") ? [entitlement] : undefined,
    transport: "browser",
  }),
);

const blocked: CapabilityDefinition[] = [
  classified({
    operationId: "onvio.certificates.secret.download",
    title: "Baixar certificado ou chave privada",
    description: "Valores secretos de certificados nunca são retornados ao modelo.",
    product: "onvio_gestao",
    domain: "certificates",
    kind: "read",
    status: "policy_blocked",
    reason: "Política de segredos permite apenas metadados.",
    risk: "secret",
    licenses: ["BRCertificados::DownloadCertificates"],
    transport: "informational",
  }),
  classified({
    operationId: "onvio.api_tokens.reveal",
    title: "Revelar tokens de API Onvio",
    description: "Tokens nunca são devolvidos pelo MCP.",
    product: "onvio_gestao",
    domain: "api",
    kind: "read",
    status: "policy_blocked",
    reason: "Tokens e segredos não podem entrar no contexto do modelo.",
    risk: "secret",
    licenses: ["OnvioBR::API"],
    transport: "informational",
  }),
  classified({
    operationId: "external.kolossus",
    title: "Kolossus Auditor",
    description: "Integração externa exibida no Onvio.",
    product: "external",
    domain: "external",
    kind: "read",
    status: "policy_blocked",
    reason: "Sistema externo fora do escopo aprovado.",
    transport: "informational",
  }),
  classified({
    operationId: "external.dominio_support",
    title: "Suporte Domínio",
    description: "Portal externo de suporte.",
    product: "external",
    domain: "external",
    kind: "read",
    status: "policy_blocked",
    reason: "Sistema externo fora do escopo aprovado.",
    transport: "informational",
  }),
];

export const CAPABILITIES: CapabilityDefinition[] = [...gestta, ...onvio, ...specialized, ...coverage, ...blocked];

export const CATALOG_VERSIONS = {
  gestta: GESTTA_VERSIONS,
  onvio: ONVIO_VERSIONS,
  verifiedAt: VERIFIED_AT,
};
