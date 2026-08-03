import { Elysia } from "elysia";
import { listSubmissions, panelStats } from "../../db/repository";

export const panelRoutes = new Elysia({ prefix: "/api/panel" }).get("/", () => {
  return {
    ...panelStats(),
    recent: listSubmissions(50),
  };
});
