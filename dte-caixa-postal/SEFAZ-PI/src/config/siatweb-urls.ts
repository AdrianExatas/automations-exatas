export const SIATWEB_HOST = "siatweb.sefaz.pi.gov.br";
export const CERT_HOST = "siatweb-certificado.sefaz.pi.gov.br";
export const SSO_HOST = "siatweb-sso.sefaz.pi.gov.br";

export const LOGIN_URL = `https://${SIATWEB_HOST}/painel-aplicacoes/login`;
export const MAIN_URL = `https://${SIATWEB_HOST}/painel-aplicacoes/main`;
export const CERT_ORIGIN = `https://${CERT_HOST}`;

export const REDIRECT_URI = `https://${SIATWEB_HOST}/painel-aplicacoes/callback`;

export const OIDC_AUTH_BASE = `https://${CERT_HOST}/auth/realms/nsw-sefaz/protocol/openid-connect`;
export const OIDC_TOKEN_URL = `https://${SSO_HOST}/auth/realms/nsw-sefaz/protocol/openid-connect/token`;

export const CONTRIBUINTES_SEARCH_URL = `https://${SIATWEB_HOST}/controle-acesso-ws/pessoas/buscar-contribuintes`;

export const AGEAT_ENTRY_URL = `https://${SIATWEB_HOST}/eageat-siatweb`;
export const AGEAT_BEM_VINDO_URL = `https://${SIATWEB_HOST}/eageat/jsp/login/bemVindo.jsf`;
