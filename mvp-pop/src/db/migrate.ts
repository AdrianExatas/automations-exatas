import { getDb } from "./client";
import { getConfig } from "../config";

getDb();
console.log(`[mvp-pop] Migração OK — ${getConfig().DATABASE_PATH}`);
