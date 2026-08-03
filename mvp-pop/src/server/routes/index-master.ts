import { Elysia } from "elysia";
import { listMasterIndex } from "../../db/repository";
import { exportMasterIndexFiles } from "../../services/master-index-file";

export const indexMasterRoutes = new Elysia({ prefix: "/api/index" })
  .get("/", () => listMasterIndex())
  .post("/export", () => exportMasterIndexFiles());
