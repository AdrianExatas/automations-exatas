import { describe, expect, it } from "vitest";
import { handleMfa, performOnvioLogin, resolveLoginOptions } from "./onvio-login";

class FakeLocator {
  constructor(
    private readonly page: FakePage,
    private readonly key: string,
  ) {}

  async waitFor(): Promise<void> {}

  async click(): Promise<void> {
    this.page.actions.push(`click:${this.key}`);
    if (this.key.includes("Verificar") || this.key.includes("Confirmar") || this.key.includes("Continuar")) {
      this.page.currentUrl = "https://onvio.com.br/staff/";
    }
  }

  async fill(value: string): Promise<void> {
    this.page.actions.push(`fill:${this.key}:${value}`);
  }

  async press(key: string): Promise<void> {
    this.page.actions.push(`press:${this.key}:${key}`);
    if (this.key.includes("Senha") && key === "Enter") {
      this.page.currentUrl = this.page.useMfa ? "https://onvio.com.br/mfa" : "https://onvio.com.br/staff/";
    }
  }

  first(): FakeLocator {
    return this;
  }
}

class FakePage {
  public actions: string[] = [];
  public currentUrl = "https://onvio.com.br/login/#/";

  constructor(public readonly useMfa: boolean) {}

  async goto(url: string): Promise<void> {
    this.actions.push(`goto:${url}`);
    this.currentUrl = url;
  }

  locator(selector: string): FakeLocator {
    return new FakeLocator(this, selector);
  }

  getByRole(role: string, options?: { name?: string | RegExp }): FakeLocator {
    const name =
      typeof options?.name === "string"
        ? options.name
        : options?.name instanceof RegExp
          ? options.name.source
          : "";
    return new FakeLocator(this, `${role}:${name}`);
  }

  async waitForURL(matcher: RegExp | ((url: URL) => boolean)): Promise<void> {
    const matches =
      matcher instanceof RegExp
        ? matcher.test(this.currentUrl)
        : matcher(new URL(this.currentUrl));

    if (!matches && this.useMfa && this.currentUrl.includes("mfa") && matcher instanceof Function) {
      this.currentUrl = "https://onvio.com.br/staff/";
      return;
    }

    if (!matches) {
      throw new Error(`URL nao corresponde: ${this.currentUrl}`);
    }
  }
}

describe("onvio login", () => {
  it("realiza login sem MFA", async () => {
    const page = new FakePage(false);

    await performOnvioLogin(page as never, {
      email: "user@example.com",
      password: "secret",
    });

    expect(page.actions).toEqual(
      expect.arrayContaining([
        "click:#trauth-continue-signin-btn",
        "fill:textbox:E-mail:user@example.com",
        "fill:textbox:Senha:secret",
      ]),
    );
  });

  it("trata MFA com codigo informado", async () => {
    const page = new FakePage(true);
    const options = resolveLoginOptions({
      email: "user@example.com",
      password: "secret",
      mfa: {
        code: "123456",
      },
    });

    page.currentUrl = "https://onvio.com.br/mfa";
    await handleMfa(page as never, options);

    expect(page.actions).toEqual(
      expect.arrayContaining([
        "click:button:E-mail|Email",
        "fill:textbox::123456",
        "click:button:Verificar|Confirmar|Continuar",
      ]),
    );
  });
});
