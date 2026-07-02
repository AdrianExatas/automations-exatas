import { describe, expect, test } from "bun:test";
import { parseFilterFields, parseNotaPage, parseViewState } from "../src/agape/parser";

const FILTER_HTML = `
<html><body>
<form id="form_conteudo" name="form_conteudo">
  <input name="form_conteudo:pesquisa" type="text" value="">
  <input class="rich-calendar-input " id="form_conteudo:j_id42InputDate" name="form_conteudo:j_id42InputDate" type="text" value="06/05/2026">
  <input id="form_conteudo:j_id42InputCurrentDate" name="form_conteudo:j_id42InputCurrentDate" type="hidden" value="05/2026">
  <input class="rich-calendar-input " id="form_conteudo:j_id46InputDate" name="form_conteudo:j_id46InputDate" type="text" value="06/05/2026">
  <input id="form_conteudo:j_id46InputCurrentDate" name="form_conteudo:j_id46InputCurrentDate" type="hidden" value="05/2026">
  <input name="form_conteudo:j_id51" type="text" value="2026">
  <input id="form_conteudo:comboStatusNota:1" name="form_conteudo:comboStatusNota" type="radio" value="F">
  <a id="form_conteudo:lupa" name="form_conteudo:lupa" href="#">Pesquisar</a>
  <input name="form_conteudo" type="hidden" value="form_conteudo">
  <input name="autoScroll" type="hidden" value="">
  <input id="javax.faces.ViewState" name="javax.faces.ViewState" type="hidden" value="j_id4">
</form>
</body></html>
`;

const TABLE_HTML = `
<html><body>
<table class="rich-table tabela" id="form_conteudo:j_id59">
  <thead><tr>
    <th id="form_conteudo:j_id59:j_id64header">Codigo</th>
    <th id="form_conteudo:j_id59:j_id67header">Numero</th>
    <th id="form_conteudo:j_id59:j_id70header">Exercicio</th>
    <th id="form_conteudo:j_id59:j_id73header">Contribuinte</th>
    <th id="form_conteudo:j_id59:j_id76header">Destinatario</th>
    <th id="form_conteudo:j_id59:j_id82header">Data de Emissao</th>
    <th id="form_conteudo:j_id59:j_id85header">Total</th>
    <th id="form_conteudo:j_id59:j_id95header">XML</th>
  </tr></thead>
  <tfoot><tr><td colspan="8">
    <table id="form_conteudo:j_id59:ds_table"><tr>
      <td class="rich-datascr-inact">1</td>
      <td class="rich-datascr-act">2</td>
      <td class="rich-datascr-inact">3</td>
      <td class="rich-datascr-button" onclick="Event.fire(this, 'rich:datascroller:onscroll', {'page': 'next'});"></td>
    </tr></table>
  </td></tr></tfoot>
  <tbody id="form_conteudo:j_id59:tb">
    <tr>
      <td id="form_conteudo:j_id59:10:j_id64">4263</td>
      <td id="form_conteudo:j_id59:10:j_id67">177</td>
      <td id="form_conteudo:j_id59:10:j_id70">2026</td>
      <td id="form_conteudo:j_id59:10:j_id73">PESSOA TESTE</td>
      <td id="form_conteudo:j_id59:10:j_id76">000.000.000-00 - CONTRIBUINTE TESTE</td>
      <td id="form_conteudo:j_id59:10:j_id82">15/04/2026</td>
      <td id="form_conteudo:j_id59:10:j_id85">550,00</td>
      <td id="form_conteudo:j_id59:10:j_id95">
        <a href="#" onclick="if(typeof jsfcljs == 'function'){jsfcljs(document.forms['form_conteudo'],'form_conteudo:j_id59:10:j_id97,form_conteudo:j_id59:10:j_id97','');}return false">XML</a>
      </td>
    </tr>
  </tbody>
</table>
<span id="ajax-view-state"><input type="hidden" name="javax.faces.ViewState" id="javax.faces.ViewState" value="j_id4"></span>
</body></html>
`;

describe("parser Agape", () => {
  test("extrai ViewState", () => {
    expect(parseViewState(FILTER_HTML)).toBe("j_id4");
  });

  test("descobre campos dinamicos do filtro", () => {
    const fields = parseFilterFields(FILTER_HTML);

    expect(fields.startDate).toBe("form_conteudo:j_id42InputDate");
    expect(fields.endDate).toBe("form_conteudo:j_id46InputDate");
    expect(fields.exercise).toBe("form_conteudo:j_id51");
    expect(fields.status).toBe("form_conteudo:comboStatusNota");
    expect(fields.submitName).toBe("form_conteudo:lupa");
  });

  test("parseia tabela e paginacao", () => {
    const page = parseNotaPage(TABLE_HTML);

    expect(page.tableId).toBe("form_conteudo:j_id59");
    expect(page.currentPage).toBe(2);
    expect(page.pageLinks).toEqual(new Set([1, 2, 3]));
    expect(page.hasNext).toBe(true);
    expect(page.notas).toHaveLength(1);
    expect(page.notas[0]?.codigo).toBe("4263");
    expect(page.notas[0]?.numero).toBe("177");
    expect(page.notas[0]?.emissao).toBe("15/04/2026");
    expect(page.notas[0]?.xmlActionName).toBe("form_conteudo:j_id59:10:j_id97");
  });

  test("retorna pagina vazia sem tabela", () => {
    const page = parseNotaPage('<span id="ajax-view-state"><input name="javax.faces.ViewState" value="j_id9"></span>');

    expect(page.tableId).toBe("");
    expect(page.currentPage).toBe(1);
    expect(page.pageLinks).toEqual(new Set([1]));
    expect(page.hasNext).toBe(false);
    expect(page.notas).toEqual([]);
    expect(page.viewState).toBe("j_id9");
  });
});
