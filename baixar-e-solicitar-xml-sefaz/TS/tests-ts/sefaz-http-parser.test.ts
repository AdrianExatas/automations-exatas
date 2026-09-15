import { describe, expect, it } from "bun:test";
import {
  parseDownloadListing,
  parseEmpresasDoFormulario,
  parseErrorMessage,
  parseForm,
  parseJsRedirect,
  simplifyFormPayload,
} from "../src-ts/sefaz-http/parser.js";

describe("sefaz-http parser", () => {
  it("extrai redirect JavaScript", () => {
    expect(parseJsRedirect("https://example.test/a/", "<script>window.location='b.jsp?x=1'</script>")).toBe(
      "https://example.test/a/b.jsp?x=1",
    );
  });

  it("extrai formulario preservando campos, selects e submit", () => {
    const form = parseForm(
      "https://security.sefaz.se.gov.br/internet/",
      "https://security.sefaz.se.gov.br/internet/process.jsp",
      `
      <form method="post" action="next.jsp">
        <input type="hidden" name="token" value="abc">
        <select name="cdPessoaContribuinte">
          <option value="">Selecione</option>
          <option selected value="123">Empresa Teste</option>
        </select>
        <input type="submit" name="okButton" value="OK">
      </form>
      `,
    );

    expect(form.actionUrl).toBe("https://security.sefaz.se.gov.br/internet/next.jsp");
    expect(form.fields.token).toEqual(["abc"]);
    expect(form.fields.cdPessoaContribuinte).toEqual(["123"]);
    expect(form.selectOptions.cdPessoaContribuinte?.["Empresa Teste"]).toBe("123");
    expect(simplifyFormPayload(form, { cdPessoaContribuinte: "456" })).toEqual([
      ["token", "abc"],
      ["cdPessoaContribuinte", "456"],
      ["okButton", "OK"],
    ]);
  });

  it("parseia downloads prontos e paginacao", () => {
    const listing = parseDownloadListing(
      "https://security.sefaz.se.gov.br/internet/",
      "https://security.sefaz.se.gov.br/internet/process.jsp?TransId=T10461",
      `
      <table>
        <tr>
          <td><a href="process.jsp?nmArquivo=271_EMPRESA_01012026_01012026_01012026000000&tdb_dsTipoDownload=NFE&dtSolicitacao=02012026090000&dsSituacao=PRONTO%20PARA%20DOWNLOAD">Baixar</a></td>
        </tr>
        <tr>
          <td><a href="process.jsp?nmArquivo=272_EMPRESA_01012026_01012026_01012026000000&tdb_dsTipoDownload=NFC&dtSolicitacao=02012026090000&dsSituacao=PROCESSANDO">Baixar</a></td>
        </tr>
      </table>
      <table><tr><td class="pgAtualNav"><b>1</b></td></tr></table>
      <a href="process.jsp?navInicio=16">2</a>
      <a href="process.jsp?TransId=T10464">Novo</a>
      `,
      true,
    );

    expect(listing.downloads).toHaveLength(1);
    expect(listing.downloads[0]?.nmArquivo).toContain("271_EMPRESA");
    expect(listing.downloads[0]?.tipoDownload).toBe("NFE");
    expect(listing.currentPage).toBe(1);
    expect(listing.pageLinks[2]).toContain("navInicio=16");
    expect(listing.newRequestUrl).toContain("TransId=T10464");
  });

  it("reconhece link novo sem texto e com redirectUrl", () => {
    const listing = parseDownloadListing(
      "https://security.sefaz.se.gov.br/internet/",
      "https://security.sefaz.se.gov.br/internet/process.jsp?TransId=T10461",
      `
      <a href="/internet/process.jsp?RedirectUrl=/internet/process.jsp?AppName=SPED;TransId=T10461;Flag=42&AppName=SPED&TransId=T10464&token=abc"></a>
      `,
    );

    expect(listing.linkCount).toBe(1);
    expect(listing.newRequestUrl).toContain("TransId=T10464");
  });

  it("reconhece TransId do link novo ignorando caixa", () => {
    const listing = parseDownloadListing(
      "https://security.sefaz.se.gov.br/internet/",
      "https://security.sefaz.se.gov.br/internet/process.jsp?TransId=T10461",
      `<a href="process.jsp?appname=SPED&transid=t10464&token=abc"></a>`,
    );

    expect(listing.newRequestUrl).toContain("transid=t10464");
  });

  it("reconhece link novo por alt ou title", () => {
    const listing = parseDownloadListing(
      "https://security.sefaz.se.gov.br/internet/",
      "https://security.sefaz.se.gov.br/internet/process.jsp?TransId=T10461",
      `<a href="process.jsp?AppName=SPED&TransId=T99999"><img alt="Nova solicitacao" title="Novo"></a>`,
    );

    expect(listing.newRequestUrl).toContain("TransId=T99999");
  });

  it("reconhece mensagem de arquivo nao localizado", () => {
    expect(parseErrorMessage("<html>O arquivo não foi localizado no servidor.</html>")).toContain("arquivo");
  });

  it("extrai empresas do select de contribuinte", () => {
    const form = parseForm(
      "https://security.sefaz.se.gov.br/internet/",
      "https://security.sefaz.se.gov.br/internet/process.jsp",
      `
      <form method="post" action="next.jsp">
        <select name="cdPessoaContribuinte">
          <option value="">Selecione</option>
          <option value="123">Empresa Teste</option>
          <option value="456">Outra Empresa</option>
        </select>
      </form>
      `,
    );

    expect(parseEmpresasDoFormulario(form)).toEqual([
      { inscricao: "123", nome: "Empresa Teste" },
      { inscricao: "456", nome: "Outra Empresa" },
    ]);
  });
});
