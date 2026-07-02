from __future__ import annotations

from agape_nfse.parser import parse_filter_fields, parse_nota_page, parse_view_state


FILTER_HTML = """
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
"""


TABLE_HTML = """
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
"""


def test_parse_view_state() -> None:
    assert parse_view_state(FILTER_HTML) == "j_id4"


def test_parse_filter_fields() -> None:
    fields = parse_filter_fields(FILTER_HTML)

    assert fields.start_date == "form_conteudo:j_id42InputDate"
    assert fields.end_date == "form_conteudo:j_id46InputDate"
    assert fields.exercise == "form_conteudo:j_id51"
    assert fields.status == "form_conteudo:comboStatusNota"
    assert fields.submit_name == "form_conteudo:lupa"


def test_parse_nota_page() -> None:
    page = parse_nota_page(TABLE_HTML)

    assert page.table_id == "form_conteudo:j_id59"
    assert page.current_page == 2
    assert page.page_links == {1, 2, 3}
    assert page.has_next is True
    assert len(page.notas) == 1
    nota = page.notas[0]
    assert nota.codigo == "4263"
    assert nota.numero == "177"
    assert nota.emissao == "15/04/2026"
    assert nota.xml_action_name == "form_conteudo:j_id59:10:j_id97"


def test_parse_empty_nota_page_without_table() -> None:
    page = parse_nota_page('<span id="ajax-view-state"><input name="javax.faces.ViewState" value="j_id9"></span>')

    assert page.table_id == ""
    assert page.current_page == 1
    assert page.page_links == {1}
    assert page.has_next is False
    assert page.notas == []
    assert page.view_state == "j_id9"
