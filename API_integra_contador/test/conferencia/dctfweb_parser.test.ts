import { describe, test, expect } from "bun:test";
import { DctfwebXmlParser } from "../../Dominio/reinf-dctfweb-conferencia/src/dctfweb/parser.ts";
import { DctfwebNormalizer } from "../../Dominio/reinf-dctfweb-conferencia/src/dctfweb/normalizer.ts";

describe("Parser e Normalizador do XML DCTFWeb", () => {
  const parser = new DctfwebXmlParser();
  const normalizer = new DctfwebNormalizer();

  test("decodifica Base64 e interpreta XML com namespaces complexos e atributos", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
    <ns2:Dctfweb xmlns:ns2="http://www.receita.fazenda.gov.br/Dctfweb/v1" versao="1.0">
      <ns2:identificacaoContribuinte>
        <ns2:cnpj>11.222.333/0001-44</ns2:cnpj>
      </ns2:identificacaoContribuinte>
      <ns2:identificacaoDeclaracao>
        <ns2:periodoApuracao>2026-01</ns2:periodoApuracao>
        <ns2:numeroRecibo>2.2026.123456789</ns2:numeroRecibo>
        <ns2:tipoDeclaracao>1</ns2:tipoDeclaracao>
      </ns2:identificacaoDeclaracao>
      <ns2:tributos>
        <!-- Origem 6: Reinf CP (DEVE ENTRAR) -->
        <ns2:tributo>
          <ns2:origem>6</ns2:origem>
          <ns2:codigoReceita>1162-01</ns2:codigoReceita>
          <ns2:descricao>CPRB - INSS</ns2:descricao>
          <ns2:baseCalculo>100000.00</ns2:baseCalculo>
          <ns2:valorDevido>4500.00</ns2:valorDevido>
          <ns2:valorDeducao>500.00</ns2:valorDeducao>
          <ns2:valorSuspenso>0.00</ns2:valorSuspenso>
          <ns2:saldoExigivel>4000.00</ns2:saldoExigivel>
        </ns2:tributo>
        <!-- Origem 7: Reinf RET (DEVE ENTRAR) -->
        <ns2:tributo>
          <ns2:origem>7</ns2:origem>
          <ns2:codigoReceita>1708</ns2:codigoReceita>
          <ns2:descricao>IRRF - PJ</ns2:descricao>
          <ns2:baseCalculo>20000.00</ns2:baseCalculo>
          <ns2:valorDevido>300.00</ns2:valorDevido>
          <ns2:saldoExigivel>300.00</ns2:saldoExigivel>
        </ns2:tributo>
        <!-- Origem 1: eSocial Folha (DEVE SER TOTALMENTE IGNORADO!) -->
        <ns2:tributo>
          <ns2:origem>1</ns2:origem>
          <ns2:codigoReceita>1082-01</ns2:codigoReceita>
          <ns2:descricao>INSS Folha de Pagamento</ns2:descricao>
          <ns2:valorDevido>25000.00</ns2:valorDevido>
          <ns2:saldoExigivel>25000.00</ns2:saldoExigivel>
        </ns2:tributo>
      </ns2:tributos>
    </ns2:Dctfweb>`;

    const base64 = Buffer.from(xml, "utf-8").toString("base64");
    const parsed = parser.decodeAndParse(base64);
    const normalized = normalizer.normalize(parsed);

    expect(normalized.cnpj).toBe("11222333000144");
    expect(normalized.competencia).toBe("2026-01");
    expect(normalized.numeroRecibo).toBe("2.2026.123456789");
    expect(normalized.tipoDeclaracao).toBe("ORIGINAL");

    // Apenas origens 6 e 7 presentes no array de tributos
    expect(normalized.tributos.length).toBe(2);

    const cp = normalized.tributos.find((t) => t.origem === 6);
    expect(cp).toBeDefined();
    expect(cp?.codigoReceita).toBe("1162-01");
    expect(cp?.baseCalculo).toBe(100000.0);
    expect(cp?.valorDevido).toBe(4500.0);
    expect(cp?.valorDeducao).toBe(500.0);
    expect(cp?.saldoExigivel).toBe(4000.0);

    const ret = normalized.tributos.find((t) => t.origem === 7);
    expect(ret).toBeDefined();
    expect(ret?.codigoReceita).toBe("1708");
    expect(ret?.valorDevido).toBe(300.0);

    // Totais apurados
    expect(normalized.totalApuradoOrigem6).toBe(4500.0);
    expect(normalized.totalApuradoOrigem7).toBe(300.0);
  });

  test("normaliza códigos de 6 dígitos sem traço para formato padronizado", () => {
    const xml = `
    <Dctfweb>
      <cnpj>00000000000000</cnpj>
      <periodoApuracao>2026-02</periodoApuracao>
      <debitos>
        <debito>
          <origem>6</origem>
          <codigoReceita>116201</codigoReceita>
          <valorDevido>150.00</valorDevido>
        </debito>
      </debitos>
    </Dctfweb>`;

    const parsed = parser.parseXml(xml);
    const norm = normalizer.normalize(parsed);
    expect(norm.tributos[0].codigoReceita).toBe("1162-01");
  });

  test("interpreta e normaliza XML oficial SERPRO DCTFWeb (ProcDctf / A050-CreditosTributariosApurados)", () => {
    const xmlOficial = `<?xml version="1.0" encoding="UTF-8"?>
    <ProcDctf xmlns="http://www.serpro.gov.br/dctf/v1">
      <ConteudoDeclaracao id="id_50000524030022">
        <DctfXml versao="3.0">
          <A000-DadosIdentificadoresContribuinte>
            <nomeContribuinte>CLINICA INTEGRADA DE PROCEDIMENTOS</nomeContribuinte>
            <inscContrib>10741183000150</inscContrib>
            <perApuracao>082026</perApuracao>
            <numRecibo>50000524030022</numRecibo>
            <indRetificacao>2</indRetificacao>
            <A050-CreditosTributariosApurados>
              <!-- eSocial: deve ser ignorado -->
              <CreditoTributarioApurado>
                <codReceita>108201</codReceita>
                <ctCodGrupo>45</ctCodGrupo>
                <ctDescricaoTributo>CP SEGURADOS - EMPREGADOS/AVULSO</ctDescricaoTributo>
                <ctValor>2386.49</ctValor>
                <saldoaPagar>2251.41</saldoaPagar>
                <vlTotalCred>135.08</vlTotalCred>
              </CreditoTributarioApurado>
              <!-- Reinf R-4000: Origem 7 deve ser incluído -->
              <CreditoTributarioApurado>
                <codReceita>170806</codReceita>
                <ctCodGrupo>14</ctCodGrupo>
                <ctDescricaoTributo>IRRF - REMUNER SERV PRESTADOS POR PJ</ctDescricaoTributo>
                <ctValor>204.89</ctValor>
                <saldoaPagar>204.89</saldoaPagar>
                <vlTotalCred>0</vlTotalCred>
              </CreditoTributarioApurado>
            </A050-CreditosTributariosApurados>
          </A000-DadosIdentificadoresContribuinte>
        </DctfXml>
      </ConteudoDeclaracao>
    </ProcDctf>`;

    const parsed = parser.parseXml(xmlOficial);
    const normalized = normalizer.normalize(parsed);

    expect(normalized.cnpj).toBe("10741183000150");
    expect(normalized.competencia).toBe("2026-08");
    expect(normalized.numeroRecibo).toBe("50000524030022");
    expect(normalized.tipoDeclaracao).toBe("RETIFICADORA");

    // Somente o código da Reinf (1708-06) deve ser importado
    expect(normalized.tributos.length).toBe(1);
    expect(normalized.tributos[0].codigoReceita).toBe("1708-06");
    expect(normalized.tributos[0].origem).toBe(7);
    expect(normalized.tributos[0].valorDevido).toBe(204.89);
    expect(normalized.tributos[0].saldoExigivel).toBe(204.89);
    expect(normalized.totalApuradoOrigem7).toBe(204.89);
    expect(normalized.totalApuradoOrigem6).toBe(0);
  });

  test("classifica CPRB (2985-01) e Produção Rural (1656-01) como Origem 6 (Reinf CP)", () => {
    const xml = `
    <Dctfweb>
      <cnpj>00000000000000</cnpj>
      <periodoApuracao>2026-08</periodoApuracao>
      <A050-CreditosTributariosApurados>
        <CreditoTributarioApurado>
          <codReceita>298501</codReceita>
          <ctDescricaoTributo>CPRB - CONTRIBUICAO PREVIDENCIARIA SOBRE RECEITA BRUTA</ctDescricaoTributo>
          <ctValor>12500.00</ctValor>
          <saldoaPagar>12500.00</saldoaPagar>
        </CreditoTributarioApurado>
        <CreditoTributarioApurado>
          <codReceita>165601</codReceita>
          <ctDescricaoTributo>CP PATRONAL - AQUISICAO PRODUCAO RURAL PJ</ctDescricaoTributo>
          <ctValor>3400.00</ctValor>
          <saldoaPagar>3400.00</saldoaPagar>
        </CreditoTributarioApurado>
      </A050-CreditosTributariosApurados>
    </Dctfweb>`;

    const parsed = parser.parseXml(xml);
    const norm = normalizer.normalize(parsed);

    expect(norm.tributos.length).toBe(2);
    expect(norm.totalApuradoOrigem6).toBe(15900.00);
    expect(norm.totalApuradoOrigem7).toBe(0.00);

    const cprb = norm.tributos.find((t) => t.codigoReceita === "2985-01");
    expect(cprb).toBeDefined();
    expect(cprb?.origem).toBe(6);
    expect(cprb?.valorDevido).toBe(12500.00);

    const rural = norm.tributos.find((t) => t.codigoReceita === "1656-01");
    expect(rural).toBeDefined();
    expect(rural?.origem).toBe(6);
    expect(rural?.valorDevido).toBe(3400.00);
  });

  test("lança erro compreensível quando XML estiver corrompido", () => {
    expect(() => parser.parseXml("<incompleto")).toThrow("Falha ao processar XML da DCTFWeb");
  });
});
