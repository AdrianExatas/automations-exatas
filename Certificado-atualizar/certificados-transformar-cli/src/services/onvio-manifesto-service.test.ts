import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { OnvioManifestoService } from "./onvio-manifesto-service";

vi.mock("axios", () => ({
  default: { put: vi.fn() },
  __esModule: true,
}));

const mockPut = vi.mocked(axios.put);

describe("OnvioManifestoService", () => {
  let service: OnvioManifestoService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OnvioManifestoService("test-token", "test-company-id");
  });

  type AxiosPutResponse = { status: number; data: unknown };

  describe("disableClient", () => {
    it("aceita status 200 como sucesso", async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: {} } as AxiosPutResponse);
      await expect(service.disableClient("client-1")).resolves.toBeUndefined();
    });

    it("aceita status 400 com mensagem de já desabilitado", async () => {
      mockPut.mockResolvedValueOnce({
        status: 400,
        data: { message: "Cliente já desabilitado" },
      } as AxiosPutResponse);
      await expect(service.disableClient("client-1")).resolves.toBeUndefined();
    });

    it("aceita status 409 (conflict)", async () => {
      mockPut.mockResolvedValueOnce({
        status: 409,
        data: { message: "already disabled" },
      } as AxiosPutResponse);
      await expect(service.disableClient("client-1")).resolves.toBeUndefined();
    });
  });

  describe("enableClient", () => {
    it("aceita status 200 como sucesso", async () => {
      mockPut.mockResolvedValueOnce({ status: 200, data: {} } as AxiosPutResponse);
      await expect(
        service.enableClient("client-1", Buffer.from("pfx"), "cert.pfx", "senha123"),
      ).resolves.toBeUndefined();
    });

    it("lança erro para status != 200", async () => {
      mockPut.mockResolvedValueOnce({
        status: 400,
        data: { message: "Certificado inválido" },
      } as AxiosPutResponse);
      await expect(
        service.enableClient("client-1", Buffer.from("pfx"), "cert.pfx", "senha123"),
      ).rejects.toThrow("Enable: 400");
    });
  });
});
