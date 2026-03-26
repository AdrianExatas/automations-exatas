export type AuthMfaMethod = "E-mail" | "SMS" | "Telefonema";

export interface AuthCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

export interface AuthStorageOrigin {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}

export interface AuthStorageState {
  cookies: AuthCookie[];
  origins: AuthStorageOrigin[];
}

export interface AuthSession {
  baseUrl: string;
  capturedAt: string;
  storageState: AuthStorageState;
  cookies: AuthCookie[];
  storageStatePath?: string;
}

export interface LoginOnvioOptions {
  email: string;
  password: string;
  baseUrl?: string;
  browser?: {
    headless?: boolean;
    slowMo?: number;
  };
  locale?: string;
  timezoneId?: string;
  mfa?: {
    method?: AuthMfaMethod;
    code?: string;
    timeoutMs?: number;
  };
  timeouts?: {
    shortMs?: number;
    mediumMs?: number;
    longMs?: number;
    mfaMs?: number;
  };
  storageStatePath?: string;
}

export interface CaptureOnvioAndGesttaTokensOptions extends LoginOnvioOptions {
  gesttaUrl?: string;
  gesttaApiBaseUrl?: string;
  artifactPath?: string;
  writeArtifact?: boolean;
}

export interface AuthArtifacts {
  capturedAt: string;
  artifactPath?: string;
  storageStatePath?: string;
  session: AuthSession;
  onvio: {
    udsLongToken: string;
    cookieExpiresAt?: string;
  };
  gestta: {
    jwt: string;
    requestUrl: string;
  };
}
