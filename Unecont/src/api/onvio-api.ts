const ONVIO_BASE = "https://onvio.com.br/api";

export interface OnvioApiConfig {
  token: string;
  departmentId: string;
  requesterId?: string;
}

export interface CreateTicketRequestBody {
  clientId: string;
  subject: string;
  description: string;
}

export interface CreateTicketResponse {
  id?: string;
  [key: string]: unknown;
}

export interface AddTopicRequestBody {
  description: string;
  status: number;
}

export interface OnvioUploadAttachment {
  fileBuffer: Buffer;
  fileName: string;
}

export class OnvioApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "OnvioApiError";
  }
}

function buildHeaders(token: string, contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
    authorization: `UDSLongToken ${token}`,
    origin: "https://onvio.com.br",
    referer: "https://onvio.com.br/br-portal-do-cliente/service-requesting/general",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  };

  if (contentType && !contentType.startsWith("multipart")) {
    headers["content-type"] = contentType;
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const statusMessage =
      response.status === 401
        ? "401 Unauthorized - token invalido ou expirado. Obtenha um novo UDSLongToken no Portal do Cliente Onvio."
        : `${response.status} ${response.statusText}`;
    throw new OnvioApiError(`Onvio API error: ${statusMessage}`, response.status, body);
  }

  return body as T;
}

function extractTicketIdFromLocation(location: string | null): string | null {
  if (!location) return null;
  const match = location.match(/\/tickets\/generic\/([A-Za-z0-9]+)/);
  return match?.[1] ?? null;
}

function resolveAttachmentContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  throw new OnvioApiError(`Extensao de arquivo nao suportada para upload: ${fileName}`);
}

export async function createTicket(
  config: OnvioApiConfig,
  body: CreateTicketRequestBody,
): Promise<CreateTicketResponse & { id?: string }> {
  const response = await fetch(`${ONVIO_BASE}/service-requesting/v1/tickets/generic`, {
    method: "POST",
    headers: buildHeaders(config.token, "application/json"),
    body: JSON.stringify({
      serviceRequestType: "GENERIC",
      clientExpanded: { id: body.clientId },
      departmentId: config.departmentId,
      description: body.description,
      subject: body.subject,
      requestWay: "OTHER",
      ...(config.requesterId ? { requesterExpanded: { id: config.requesterId } } : {}),
    }),
  });

  const raw = await handleResponse<CreateTicketResponse | null>(response);
  const data =
    raw && typeof raw === "object" ? raw : ({} as CreateTicketResponse & { id?: string });
  const idFromLocation = extractTicketIdFromLocation(response.headers.get("location"));

  return {
    ...data,
    id: (data.id as string | undefined) ?? idFromLocation ?? undefined,
  };
}

export async function addTopic(
  config: OnvioApiConfig,
  ticketId: string,
  body: AddTopicRequestBody,
): Promise<unknown> {
  const response = await fetch(`${ONVIO_BASE}/service-requesting/v1/tickets/${ticketId}/topics`, {
    method: "POST",
    headers: buildHeaders(config.token, "application/json"),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function addAttachment(
  config: OnvioApiConfig,
  ticketId: string,
  attachment: OnvioUploadAttachment,
): Promise<unknown> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(attachment.fileBuffer)], {
    type: resolveAttachmentContentType(attachment.fileName),
  });
  formData.append("file[]", blob, attachment.fileName);

  const headers = buildHeaders(config.token);
  delete headers["content-type"];

  const response = await fetch(
    `${ONVIO_BASE}/service-requesting/v1/tickets/${ticketId}/attachments`,
    {
      method: "POST",
      headers,
      body: formData,
    },
  );

  return handleResponse(response);
}

function extractTicketId(ticket: CreateTicketResponse): string | null {
  if (ticket.id) return ticket.id;
  if (typeof (ticket as { ticketId?: string }).ticketId === "string") {
    return (ticket as { ticketId: string }).ticketId;
  }
  const nestedData = (ticket as { data?: { id?: string } }).data;
  return nestedData?.id ?? null;
}

export async function uploadReportToOnvio(
  config: OnvioApiConfig,
  params: {
    clientId: string;
    subject: string;
    description: string;
    attachments: OnvioUploadAttachment[];
  },
): Promise<{ ticketId: string }> {
  if (params.attachments.length === 0) {
    throw new OnvioApiError("Nenhum anexo informado para upload.");
  }

  const ticket = await createTicket(config, {
    clientId: params.clientId,
    subject: params.subject,
    description: params.description,
  });

  const ticketId = extractTicketId(ticket);
  if (!ticketId) {
    throw new OnvioApiError("Resposta da API nao contem ticket ID", undefined, ticket);
  }

  await addTopic(config, ticketId, {
    description: params.description,
    status: 4,
  });

  for (const attachment of params.attachments) {
    await addAttachment(config, ticketId, attachment);
  }

  return { ticketId };
}
