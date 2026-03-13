import type { Page } from "playwright";
import type { Config } from "../config";
import { LoginError } from "../exceptions";
import { LoginPage } from "../pages/login-page";

export class LoginFlow {
  private readonly loginPage: LoginPage;

  constructor(
    private readonly page: Page,
    private readonly config: Config,
  ) {
    this.loginPage = new LoginPage(page);
  }

  async execute(): Promise<void> {
    await this.page.goto(this.config.loginUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const url = this.page.url();
    if (!url.includes("Login.aspx")) {
      return; // já logado
    }

    const loaded = await this.loginPage.isLoaded(this.config.defaultTimeout * 1000);
    if (!loaded) {
      throw new LoginError(`Página de login não carregou. URL: ${url}`);
    }

    await this.loginPage.login(this.config.unecontEmail, this.config.unecontSenha);

    await this.page
      .waitForFunction(() => !window.location.href.includes("Login.aspx"), {
        timeout: this.config.defaultTimeout * 1000,
      })
      .catch(() => {
        const current = this.page.url();
        if (!current.includes("Login.aspx")) return;
        throw new LoginError("Login pode ter falhado - ainda na página de login");
      });
  }
}
