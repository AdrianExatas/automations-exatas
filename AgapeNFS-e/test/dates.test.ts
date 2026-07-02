import { describe, expect, test } from "bun:test";
import { formatBrDate, formatCurrentMonth, parseIsoDate, yearMonthFromBrDate } from "../src/agape/dates";

describe("datas", () => {
  test("converte ISO para formatos do Agape", () => {
    const date = parseIsoDate("2026-04-30");

    expect(formatBrDate(date)).toBe("30/04/2026");
    expect(formatCurrentMonth(date)).toBe("04/2026");
  });

  test("recusa data invalida", () => {
    expect(() => parseIsoDate("2026-02-31")).toThrow("Data invalida");
  });

  test("extrai pasta ano-mes da emissao BR", () => {
    expect(yearMonthFromBrDate("15/04/2026")).toBe("2026-04");
    expect(yearMonthFromBrDate("sem data")).toBe("sem-data");
  });
});
