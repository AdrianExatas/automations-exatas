import { app } from "electron";
import { configureBundledPlaywright } from "../playwright-runtime";

configureBundledPlaywright(app.isPackaged, process.resourcesPath);
void import("./main");
