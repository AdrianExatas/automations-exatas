import { createRequire } from "node:module";
import type * as OnvioAuth from "@exatas/onvio-auth";
import { inventoryFrontend } from "../browser/inventory.js";

const require = createRequire(import.meta.url);
const { resolveWorkspaceAuthArtifactPath, loadAuthArtifactsFromFile } = require("@exatas/onvio-auth") as typeof OnvioAuth;

const artifactPath = process.env.ONVIO_AUTH_ARTIFACT_PATH || resolveWorkspaceAuthArtifactPath(process.cwd());
const artifact = loadAuthArtifactsFromFile(artifactPath);
if (!artifact?.session.storageStatePath) throw new Error("Artefato não contém session.storageStatePath.");

const result = await inventoryFrontend(artifact.session.storageStatePath);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
