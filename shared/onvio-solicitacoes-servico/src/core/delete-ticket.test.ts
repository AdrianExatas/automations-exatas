import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteTicket,
  normalizeTicketIdForDelete,
  OnvioApiError,
} from "./service-request-api";

describe("normalizeTicketIdForDelete", () => {
  it("formata hex de 32 chars como UUID com hifens em lowercase", () => {
    expect(normalizeTicketIdForDelete("AE8439D30E7C49AFA5AF3E0FBFFBC807")).toBe(
      "ae8439d3-0e7c-49af-a5af-3e0fbffbc807",
    );
  });

  it("mantem UUID com hifens (lowercase) sem duplicar", () => {
    expect(normalizeTicketIdForDelete("57d4f730-071b-4a75-a82b-6a6cd81d2065")).toBe(
      "57d4f730-071b-4a75-a82b-6a6cd81d2065",
    );
    expect(normalizeTicketIdForDelete("57D4F730-071B-4A75-A82B-6A6CD81D2065")).toBe(
      "57d4f730-071b-4a75-a82b-6a6cd81d2065",
    );
  });
});

describe("deleteTicket", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("apaga com DELETE /tickets/generic/{uuid} normalizando hex", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteTicket("token", "AE8439D30E7C49AFA5AF3E0FBFFBC807");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://onvio.com.br/api/service-requesting/v1/tickets/generic/ae8439d3-0e7c-49af-a5af-3e0fbffbc807",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("usa UUID com hifens sem reformatar estrutura", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteTicket("token", "57d4f730-071b-4a75-a82b-6a6cd81d2065");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://onvio.com.br/api/service-requesting/v1/tickets/generic/57d4f730-071b-4a75-a82b-6a6cd81d2065",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("propaga erro da API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: "ID is invalid for generic ticket deletion" },
        }),
        { status: 500, statusText: "Internal Server Error" },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteTicket("token", "ABC123")).rejects.toBeInstanceOf(OnvioApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://onvio.com.br/api/service-requesting/v1/tickets/generic/ABC123",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
