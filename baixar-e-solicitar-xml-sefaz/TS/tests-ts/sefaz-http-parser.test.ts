import { describe, expect, it } from "bun:test";
import {
  parseDownloadListing,
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

  it("reconhece mensagem de arquivo nao localizado", () => {
    expect(parseErrorMessage("<html>O arquivo não foi localizado no servidor.</html>")).toContain("arquivo");
  });
});
