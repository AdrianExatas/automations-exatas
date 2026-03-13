export class EmpresaNotFoundError extends Error {
  constructor(
    message: string,
    public readonly cnpj: string,
  ) {
    super(message);
    this.name = "EmpresaNotFoundError";
  }
}

export class NoNotasError extends Error {
  constructor(
    message: string,
    public readonly cnpj: string,
  ) {
    super(message);
    this.name = "NoNotasError";
  }
}

export class DownloadError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = "DownloadError";
  }
}

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
  }
}

export class NavigationError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
  ) {
    super(message);
    this.name = "NavigationError";
  }
}
