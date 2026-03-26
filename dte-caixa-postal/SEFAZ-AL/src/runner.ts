import { collectLatestNotificationsForAllCompanies } from "./app.js";

collectLatestNotificationsForAllCompanies().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  process.exit();
});
