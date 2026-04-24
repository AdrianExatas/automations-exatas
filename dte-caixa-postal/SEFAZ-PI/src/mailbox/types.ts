import type { Company } from "../companies.js";

export type MailboxNotification = {
  status: string;
  scienceSituation: string;
  type: string;
  recipientRegistration: string;
  sender: string;
  issuedAtText: string;
  subject: string;
  readAtText: string;
  scienceAtText: string;
  viewableUntilText: string;
};

export type CompanyMailboxResult = {
  company: Company;
  result: "NOTIFICACOES_ENCONTRADAS" | "SEM_NOTIFICACOES_NO_PERIODO" | "ERRO_CONSULTA";
  notifications: MailboxNotification[];
  errorMessage?: string;
};
