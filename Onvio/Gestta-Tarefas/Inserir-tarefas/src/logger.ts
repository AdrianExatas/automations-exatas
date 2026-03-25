import { ProgressoLogEvento } from "./types";

function formatTaskPrefix(event: ProgressoLogEvento): string {
  if (typeof event.taskIndex === "number" && typeof event.taskTotal === "number") {
    return `[tarefa ${event.taskIndex}/${event.taskTotal}]`;
  }
  return "[tarefa]";
}

function formatCompanyPrefix(event: ProgressoLogEvento): string {
  if (!event.customerName) return "";

  const parts: string[] = [];
  if (typeof event.companyIndex === "number" && typeof event.companyTotal === "number") {
    parts.push(`empresa ${event.companyIndex}/${event.companyTotal}`);
  } else {
    parts.push("empresa");
  }

  const empresa = event.cnpj
    ? `${event.customerName} (${event.cnpj})`
    : event.customerName;

  return `[${parts.join(" ")}] ${empresa}`;
}

export function formatProgressLog(event: ProgressoLogEvento): string {
  const time = new Date(event.timestamp).toLocaleTimeString("pt-BR", {
    hour12: false,
  });
  const taskPrefix = formatTaskPrefix(event);
  const companyPrefix = formatCompanyPrefix(event);
  const prefixes = [time, taskPrefix, `[${event.etapa}]`];
  if (companyPrefix) prefixes.push(companyPrefix);
  prefixes.push(event.mensagem);
  return prefixes.join(" ");
}

export function logProgressEvent(event: ProgressoLogEvento): void {
  const formatted = formatProgressLog(event);
  process.stdout.write(`${formatted}\n`);
}
